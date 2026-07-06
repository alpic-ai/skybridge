import "./env.js";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { zipSync } from "fflate";
import { FileRef, McpServer, text } from "skybridge/server";
import { z } from "zod";
import { uploadToR2 } from "./r2.js";

// Common MIME types → extension, so an extracted file keeps a usable name when
// the host gives no file name. Unknown types fall back to no extension.
const MIME_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/json": "json",
  "application/zip": "zip",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "text/plain": "txt",
  "text/csv": "csv",
  "text/markdown": "md",
  "text/html": "html",
  "audio/mpeg": "mp3",
  "video/mp4": "mp4",
};

/** Original file name, or "file" plus a MIME-derived extension as a fallback. */
function entryNameFor(file: FileRef): string {
  // prevent path-traversal attack
  const segment = (file.file_name ?? "").split(/[/\\]/).pop() ?? "";
  const base =
    segment && segment !== "." && segment !== ".." ? segment : "file";
  if (extname(base)) {
    return base;
  }
  const ext = MIME_EXT[file.mime_type?.split(";")[0].trim() ?? ""];
  return ext ? `${base}.${ext}` : base;
}

const server = new McpServer(
  {
    name: "zip",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerTool(
  {
    name: "zip-file",
    description:
      "Compress one file into a downloadable .zip archive. Call without a file to open the picker widget.",
    inputSchema: {
      file: FileRef.optional().describe("The file to compress."),
    },
    outputSchema: {
      archive: FileRef.optional().describe("The generated .zip archive."),
      originalBytes: z.number().optional().describe("Size of the input file."),
      zippedBytes: z
        .number()
        .optional()
        .describe("Size of the resulting archive."),
    },

    _meta: {
      "openai/fileParams": ["file"],
      "openai/widgetAccessible": true,
      "openai/toolInvocation/invoking": "Zipping your file…",
      "openai/toolInvocation/invoked": "Archive ready.",
    },
    view: {
      component: "zip-file",
      description: "Pick a file and download it as a zip.",
    },
  },
  async ({ file }) => {
    if (!file) {
      return {
        structuredContent: {},
        content: [
          text(
            "No file provided. Pick a file in the widget to create a zip archive.",
          ),
        ],
        isError: false,
      };
    }

    const response = await fetch(file.download_url);
    if (!response.ok) {
      return {
        content: [text(`Download failed (HTTP ${response.status}).`)],
        isError: true,
      };
    }
    const input = Buffer.from(await response.arrayBuffer());

    const entryName = entryNameFor(file);
    const archiveName = `${entryName}.zip`;
    const zipped = Buffer.from(zipSync({ [entryName]: input }));

    const id = `${randomUUID()}/${archiveName}`;
    const downloadUrl = await uploadToR2(id, zipped);

    return {
      structuredContent: {
        archive: {
          file_id: id,
          download_url: downloadUrl,
          file_name: archiveName,
          mime_type: "application/zip",
        },
        originalBytes: input.length,
        zippedBytes: zipped.length,
      },
      content: [
        text(
          `Created ${archiveName} (${input.length} → ${zipped.length} bytes).`,
        ),
      ],
      isError: false,
    };
  },
);

export default await server.run();

export type AppType = typeof server;

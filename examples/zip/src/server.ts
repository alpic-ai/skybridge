import "./env.js";
import { FileRef, McpServer, text } from "skybridge/server";
import { z } from "zod";
import { assertR2Configured } from "./r2.js";
import { storeArchive } from "./storage.js";
import { createZip } from "./zip.js";

assertR2Configured();

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
      file: FileRef.optional().describe(
        "The file to compress. Omit to let the user pick one in the widget.",
      ),
    },
    outputSchema: {
      archive: FileRef.optional().describe(
        "The generated .zip archive, when a file was compressed.",
      ),
      originalBytes: z
        .number()
        .optional()
        .describe("Size of the input file."),
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

    try {
      const response = await fetch(file.download_url);
      if (!response.ok) {
        return {
          content: [text(`Download failed (HTTP ${response.status}).`)],
          isError: true,
        };
      }
      const input = Buffer.from(await response.arrayBuffer());

      const entryName = file.file_name ?? "file";
      const archiveName = `${entryName}.zip`;
      const zipped = createZip([{ name: entryName, data: input }]);

      const { id, downloadUrl } = await storeArchive(zipped, archiveName);

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
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
);

export default await server.run();

export type AppType = typeof server;

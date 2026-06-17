import { FileRef, McpServer, text } from "skybridge/server";
import { z } from "zod";
import { getArchive, storeArchive } from "./storage.js";
import { createZip } from "./zip.js";

const server = new McpServer(
  {
    name: "zip",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerTool(
  {
    name: "zip-files",
    description: "Compress one file into a single downloadable .zip archive.",
    inputSchema: {
      file: FileRef.describe("The file to compress into a .zip archive."),
    },
    outputSchema: {
      archive: FileRef.describe("The generated .zip archive."),
      originalBytes: z.number().describe("Size of the input file."),
      zippedBytes: z.number().describe("Size of the resulting archive."),
    },

    _meta: {
      "openai/fileParams": ["file"],
      "openai/widgetAccessible": true,
      "openai/toolInvocation/invoking": "Zipping your file…",
      "openai/toolInvocation/invoked": "Archive ready.",
    },
    view: {
      component: "zip-files",
      // Replace with the URL your widget will be served from in production.
      domain: "https://skybridge.tech",
      description: "Pick a file and download it as a zip.",
    },
  },
  async ({ file }, extra) => {
    // 1. Télécharger le fichier reçu.
    const response = await fetch(file.download_url);
    if (!response.ok) {
      return {
        content: [text(`Échec du téléchargement (HTTP ${response.status}).`)],
        isError: true,
      };
    }
    const input = Buffer.from(await response.arrayBuffer());

    // 2. Zipper (zlib).
    const entryName = file.file_name ?? "file";
    const archiveName = `${entryName}.zip`;
    const zipped = createZip([{ name: entryName, data: input }]);

    // 3. Ranger en stockage temporaire (R2 en prod, mémoire en dev).
    //    Pour le fallback local, on dérive l'URL de la requête entrante.
    const headers = (extra.requestInfo?.headers ?? {}) as Record<
      string,
      string | string[] | undefined
    >;
    const pick = (name: string) => {
      const value = headers[name];
      return Array.isArray(value) ? value[0] : value;
    };
    const host = pick("x-forwarded-host") ?? pick("host") ?? "localhost:3000";
    const proto = pick("x-forwarded-proto") ?? "http";
    const { id, downloadUrl } = await storeArchive(
      zipped,
      archiveName,
      (archiveId) => `${proto}://${host}/files/${archiveId}`,
    );

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

// Route locale qui sert les archives stockées en mémoire (fallback dev).
// Note : sur Alpic Cloud, seul `/mcp` est routé — d'où R2 en production.
server.use((req, res, next) => {
  const match = /^\/files\/([^/]+)$/.exec(req.path);
  if (req.method !== "GET" || !match) {
    next();
    return;
  }
  const archive = getArchive(match[1]);
  if (!archive) {
    res.status(404).json({ error: "Archive introuvable ou expirée." });
    return;
  }
  res.setHeader("Content-Type", archive.mimeType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${archive.fileName}"`,
  );
  res.send(archive.data);
});

export default await server.run();

export type AppType = typeof server;

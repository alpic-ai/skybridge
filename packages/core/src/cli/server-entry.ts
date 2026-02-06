import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express, { type Express } from "express";
import { createMcpMiddleware, McpServer } from "skybridge/server";
import type { ViteDevServer } from "vite";

const serverPath = path.resolve(process.cwd(), "server/src/server.ts");
let serverModule: { default: McpServer };
try {
  serverModule = await import(serverPath);
} catch {
  console.error(
    "Error: A server.ts file must be present in the server/src directory",
  );
  process.exit(1);
}
const server = serverModule.default;

if (!server) {
  console.error("Error: server.ts must export a default MCP server instance");
  process.exit(1);
}

if (!(server instanceof McpServer)) {
  console.error(
    "Error: server.ts must export an instance of McpServer imported from 'skybridge/server'",
  );
  process.exit(1);
}

const app = express() as Express & { vite?: ViteDevServer };

app.use(express.json());
app.use(createMcpMiddleware(server));

const env = process.env.NODE_ENV || "development";

if (env !== "production") {
  const { widgetsDevServer } = await import("skybridge/server");
  const { devtoolsStaticServer } = await import("@skybridge/devtools");
  app.use(await devtoolsStaticServer());
  app.use(await widgetsDevServer());
}

if (env === "production") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  app.use("/assets", cors());
  app.use("/assets", express.static(path.join(__dirname, "assets")));
}

const port = 3000;
app.listen(port, (error) => {
  if (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
});

process.on("SIGINT", async () => {
  console.log("Server shutdown complete");
  process.exit(0);
});

import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "skybridge/server";
import { z } from "zod";

// Run from this directory so widgetsDevServer finds web/vite.config.ts
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

process.env.__PORT = process.env.__PORT ?? "4101";

const server = new McpServer(
  {
    name: "e2e-fixture",
    version: "0.0.0",
  },
  { capabilities: {} },
)
  .registerTool(
    "echo",
    {
      description: "Echo back the input message",
      inputSchema: { message: z.string().describe("The message to echo") },
    },
    async ({ message }) => ({
      structuredContent: { message },
      content: [{ type: "text", text: message }],
      isError: false,
    }),
  )
  .registerWidget(
    "echo-card",
    { description: "Echo card widget" },
    {
      description: "Echo back the input message and render it in a widget",
      inputSchema: { message: z.string().describe("The message to echo") },
    },
    async ({ message }) => ({
      structuredContent: { message },
      content: [{ type: "text", text: message }],
      isError: false,
    }),
  );

await server.run();

console.log(`E2E fixture MCP server listening on port ${process.env.__PORT}`);

import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "skybridge/server";
import { z } from "zod";

// Run from the web/ subdir so viewsDevServer finds vite.config.ts there.
const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(fixtureDir, "web"));

process.env.__PORT = process.env.__PORT ?? "4101";

const server = new McpServer(
  {
    name: "e2e-fixture",
    version: "0.0.0",
  },
  { capabilities: {} },
)
  .registerTool(
    {
      name: "echo",
      description: "Echo back the input message",
      inputSchema: { message: z.string().describe("The message to echo") },
    },
    async ({ message }) => ({
      structuredContent: { message },
      content: [{ type: "text", text: message }],
      isError: false,
    }),
  )
  .registerTool(
    {
      name: "echo-card",
      description: "Echo back the input message and render it in a widget",
      inputSchema: { message: z.string().describe("The message to echo") },
      view: {
        component: "echo-card",
        description: "Echo card widget",
      },
    },
    async ({ message }) => ({
      structuredContent: { message },
      content: [{ type: "text", text: message }],
      isError: false,
    }),
  )
  .registerTool(
    {
      name: "model-only-tool",
      description: "Only the agent can call this tool",
      _meta: { ui: { visibility: ["model"] } },
    },
    async () => ({
      structuredContent: { ok: true },
      content: [{ type: "text", text: "ok" }],
      isError: false,
    }),
  )
  .registerTool(
    {
      name: "app-only-tool",
      description: "Only the widget can call this tool",
      _meta: { ui: { visibility: ["app"] } },
    },
    async () => ({
      structuredContent: { ok: true },
      content: [{ type: "text", text: "ok" }],
      isError: false,
    }),
  )
  .registerTool(
    {
      name: "dual-visibility-tool",
      description: "Both the agent and the widget can call this tool",
      _meta: { ui: { visibility: ["model", "app"] } },
    },
    async () => ({
      structuredContent: { ok: true },
      content: [{ type: "text", text: "ok" }],
      isError: false,
    }),
  )
  .registerTool(
    {
      name: "long-description-tool",
      description:
        "This tool ships with a deliberately verbose description so DevTools can exercise the ellipsis behaviour in the sidebar and the click-to-expand Dialog inside the tool card. It should wrap to multiple lines, get clamped to two lines in the collapsed sidebar entry, and render in full once the user opens the description modal. The body intentionally includes several sentences to cover line-clamp, truncation, and the way long, paragraph-style prose flows inside the rounded muted container.",
    },
    async () => ({
      structuredContent: { ok: true },
      content: [{ type: "text", text: "ok" }],
      isError: false,
    }),
  );

export type AppType = typeof server;

await server.run();

console.log(`E2E fixture MCP server listening on port ${process.env.__PORT}`);

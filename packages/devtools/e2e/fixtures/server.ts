import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import {
  McpServer,
  optionalBearerAuth,
  requireBearerAuth,
} from "skybridge/server";
import { z } from "zod";
import { createMockAuthServer } from "./mock-auth-server.js";
import { SEED_CLIENT_ID, SEED_TOKEN } from "./seed-auth.js";

// Run from the web/ subdir so viewsDevServer finds vite.config.ts there.
const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(fixtureDir, "web"));

process.env.__PORT = process.env.__PORT ?? "4101";

// --auth          → /mcp wrapped with requireBearerAuth (every request needs a token)
// --auth --optional → /mcp wrapped with optionalBearerAuth (mixed auth; per-tool gating)
const REQUIRES_AUTH = process.argv.includes("--auth");
const OPTIONAL_AUTH = process.argv.includes("--optional");

const serverName = REQUIRES_AUTH
  ? OPTIONAL_AUTH
    ? "e2e-mixed-auth-fixture"
    : "e2e-auth-fixture"
  : "e2e-fixture";

const baseServer = new McpServer(
  { name: serverName, version: "0.0.0" },
  { capabilities: {} },
);

if (REQUIRES_AUTH) {
  const serverUrl = `http://localhost:${process.env.__PORT}`;
  const mockAuth = createMockAuthServer({
    serverUrl,
    seedTokens: [{ token: SEED_TOKEN, clientId: SEED_CLIENT_ID }],
  });
  const bearerAuth = OPTIONAL_AUTH ? optionalBearerAuth : requireBearerAuth;
  baseServer
    .use(cors())
    .use(mockAuth.router)
    .use(
      "/mcp",
      bearerAuth({
        verifier: { verifyAccessToken: mockAuth.verifyAccessToken },
      }),
    );
}

const server = baseServer
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
  )
  .registerTool(
    {
      name: "whoami",
      description:
        "Returns the authenticated client id, or 'anonymous' when called without a bearer token. Works in mixed-auth mode.",
      inputSchema: {},
      securitySchemes: [{ type: "noauth" }, { type: "oauth2" }],
    },
    async (_args, extra) => {
      const clientId = extra.authInfo?.clientId ?? "anonymous";
      return {
        structuredContent: { clientId },
        content: [{ type: "text", text: clientId }],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "private-whoami",
      description:
        "Returns the authenticated client id. Requires a bearer token; rejects unauthenticated calls.",
      inputSchema: {},
      securitySchemes: [{ type: "oauth2" }],
    },
    async (_args, extra) => {
      if (!extra.authInfo) {
        throw new Error("authentication required");
      }
      return {
        structuredContent: { clientId: extra.authInfo.clientId },
        content: [{ type: "text", text: extra.authInfo.clientId }],
        isError: false,
      };
    },
  );

export type AppType = typeof server;

await server.run();

console.log(`E2E fixture MCP server listening on port ${process.env.__PORT}`);

import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import { McpServer, requireBearerAuth } from "skybridge/server";
import { z } from "zod";
import { createMockAuthServer } from "./mock-auth-server.js";

// Run from the web/ subdir so viewsDevServer finds vite.config.ts there.
const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(fixtureDir, "web"));

process.env.__PORT = process.env.__PORT ?? "4101";

const REQUIRES_AUTH = process.argv.includes("--auth");

export const VALID_TOKEN = "e2e-auth-valid-token";
export const CLIENT_ID = "e2e-auth-client";

const baseServer = new McpServer(
  {
    name: REQUIRES_AUTH ? "e2e-auth-fixture" : "e2e-fixture",
    version: "0.0.0",
  },
  { capabilities: {} },
);

if (REQUIRES_AUTH) {
  const serverUrl = `http://localhost:${process.env.__PORT}`;
  const mockAuth = createMockAuthServer({
    serverUrl,
    seedTokens: [{ token: VALID_TOKEN, clientId: CLIENT_ID }],
  });
  baseServer
    .use(cors())
    .use(mockAuth.router)
    .use(
      "/mcp",
      requireBearerAuth({
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
      name: "whoami",
      description: "Returns the authenticated client id",
      inputSchema: {},
    },
    async (_args, extra) => {
      const clientId = extra.authInfo?.clientId ?? "anonymous";
      return {
        structuredContent: { clientId },
        content: [{ type: "text", text: clientId }],
        isError: false,
      };
    },
  );

export type AppType = typeof server;

await server.run();

console.log(`E2E fixture MCP server listening on port ${process.env.__PORT}`);

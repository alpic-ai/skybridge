import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import {
  type AuthInfo,
  InvalidTokenError,
  McpServer,
  mcpAuthMetadataRouter,
  requireBearerAuth,
} from "skybridge/server";
import { z } from "zod";

// Run from the web/ subdir so viewsDevServer finds vite.config.ts there.
const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(fixtureDir, "web"));

process.env.__PORT = process.env.__PORT ?? "4101";

const REQUIRES_AUTH = process.argv.includes("--auth");

export const VALID_TOKEN = "e2e-auth-valid-token";
export const CLIENT_ID = "e2e-auth-client";

async function verifyAccessToken(token: string): Promise<AuthInfo> {
  if (token !== VALID_TOKEN) {
    throw new InvalidTokenError("invalid token");
  }
  return {
    token,
    clientId: CLIENT_ID,
    scopes: [],
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  };
}

const baseServer = new McpServer(
  {
    name: REQUIRES_AUTH ? "e2e-auth-fixture" : "e2e-fixture",
    version: "0.0.0",
  },
  { capabilities: {} },
);

if (REQUIRES_AUTH) {
  const SERVER_URL = `http://localhost:${process.env.__PORT}`;
  baseServer
    .use(cors())
    .use(
      mcpAuthMetadataRouter({
        oauthMetadata: {
          issuer: SERVER_URL,
          authorization_endpoint: `${SERVER_URL}/authorize`,
          token_endpoint: `${SERVER_URL}/token`,
          response_types_supported: ["code"],
        },
        resourceServerUrl: new URL(`${SERVER_URL}/mcp`),
      }),
    )
    .use("/mcp", requireBearerAuth({ verifier: { verifyAccessToken } }));
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

import { Skybridge, type SkybridgeServer } from "skybridge/server";

// Register tools with `server.registerTool(...)`.
// Docs: https://docs.skybridge.tech/api-reference/register-tool

export const handler = (server: SkybridgeServer) => server;

export const app = new Skybridge({
  name: "skybridge-blank",
  version: "0.0.1",
  capabilities: {},
  handler,
});

export type AppType = typeof app;

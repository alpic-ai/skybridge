import { Skybridge } from "skybridge/server";

// Register tools with `server.registerTool(...)`.
// Docs: https://docs.skybridge.tech/api-reference/register-tool

export const app = new Skybridge({
  name: "skybridge-blank",
  version: "0.0.1",
  capabilities: {},
  handler: (server) => server,
});

export type AppType = typeof app;

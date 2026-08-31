import { Skybridge, type SkybridgeServer } from "skybridge/server";

// Register tools with `server.registerTool(...)`.
// Docs: https://docs.skybridge.tech/api-reference/register-tool

export const serverFactory = (server: SkybridgeServer) => server;

export const app = new Skybridge(
  {
    name: "skybridge-blank",
    version: "0.0.1",
    capabilities: {},
  },
  serverFactory,
);

export type AppType = typeof app;

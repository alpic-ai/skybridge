import { McpServer } from "skybridge/server";

const server = new McpServer(
  {
    name: "skybridge-blank",
    version: "0.0.1",
  },
  { capabilities: {} },
);

// Register tools with `server.registerTool(...)`.
// Docs: https://docs.skybridge.tech/api-reference/register-tool

export default await server.run();

export type AppType = typeof server;

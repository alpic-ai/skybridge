import http from "node:http";
import {
  createClaudeSessionServer,
  devtoolsStaticServer,
} from "@skybridge/devtools";
import expressLib from "express";
import type express from "express";
import { detectAvailablePort } from "../cli/detect-port.js";
import { createDevtoolsMcpRouter } from "./devtools-mcp-server.js";
import { ScreenshotBridge } from "./screenshot-bridge.js";
import { widgetsDevServer } from "./widgetsDevServer.js";

interface DevMiddlewareOptions {
  claude?: boolean;
}

export async function setupDevMiddleware(
  app: express.Express,
  httpServer: http.Server,
  options: DevMiddlewareOptions = {},
): Promise<void> {
  if (options.claude) {
    const bridge = new ScreenshotBridge();
    app.use(bridge.createExpressRouter());

    // Spin up a dedicated HTTP server for the devtools MCP surface so it is
    // fully isolated from the user's app (no shared middleware, no auth bleed).
    const mcpApp = expressLib();
    mcpApp.use(expressLib.json());
    mcpApp.use("/", createDevtoolsMcpRouter(bridge));
    const mcpHttpServer = http.createServer(mcpApp);
    const mcpPort = await detectAvailablePort(3002);
    await new Promise<void>((resolve) =>
      mcpHttpServer.listen(mcpPort, resolve),
    );
    const devtoolsMcpUrl = `http://localhost:${mcpPort}`;

    const sessionServer = await createClaudeSessionServer({
      cwd: process.cwd(),
      devtoolsMcpUrl,
    });
    process.env.__CLAUDE_WS_PORT__ = String(sessionServer.port);

    const onExit = () => {
      sessionServer.cleanup();
      mcpHttpServer.close();
      process.exit(0);
    };
    process.once("SIGINT", onExit);
    process.once("SIGTERM", onExit);
  }

  app.use(await devtoolsStaticServer());
  app.use(await widgetsDevServer(httpServer));
}

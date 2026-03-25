import type http from "node:http";
import { devtoolsStaticServer } from "@skybridge/devtools";
import type express from "express";
import { createClaudeSessionServer } from "./claude-session-server.js";
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
    const port = process.env.__PORT ?? process.env.PORT ?? "3000";
    const devtoolsMcpUrl = `http://localhost:${port}/mcp-devtools`;
    app.use("/mcp-devtools", createDevtoolsMcpRouter(bridge));

    const sessionServer = createClaudeSessionServer({
      cwd: process.cwd(),
      devtoolsMcpUrl,
    });
    process.env.__CLAUDE_WS_PORT__ = String(sessionServer.port);

    const onExit = () => {
      sessionServer.cleanup();
      process.exit(0);
    };
    process.once("SIGINT", onExit);
    process.once("SIGTERM", onExit);
  }

  app.use(await devtoolsStaticServer());
  app.use(await widgetsDevServer(httpServer));
}

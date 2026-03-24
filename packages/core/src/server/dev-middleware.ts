import type http from "node:http";
import {
  createClaudeSessionServer,
  createDevtoolsMcpRouter,
  devtoolsStaticServer,
  ScreenshotBridge,
} from "@skybridge/devtools";
import type express from "express";
import { widgetsDevServer } from "./widgetsDevServer.js";

interface DevMiddlewareOptions {
  claude?: boolean;
}

export async function setupDevMiddleware(
  app: express.Express,
  httpServer: http.Server,
  options: DevMiddlewareOptions = {},
): Promise<void> {
  let claudeWsPort: number | undefined;

  if (options.claude) {
    const bridge = new ScreenshotBridge();
    app.use(bridge.createExpressRouter());
    const port = process.env.__PORT ?? process.env.PORT ?? "3000";
    const devtoolsMcpUrl = `http://localhost:${port}/mcp-devtools`;
    app.use("/mcp-devtools", createDevtoolsMcpRouter(bridge));
    ({ port: claudeWsPort } = createClaudeSessionServer({
      cwd: process.cwd(),
      devtoolsMcpUrl,
    }));
  }

  app.use(await devtoolsStaticServer({ claudeWsPort }));
  app.use(await widgetsDevServer(httpServer));
}

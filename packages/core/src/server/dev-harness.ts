import type http from "node:http";
import {
  ScreenshotBridge,
  createClaudeSessionServer,
  createDevtoolsMcpRouter,
  devtoolsStaticServer,
} from "@skybridge/devtools";
import type express from "express";
import { widgetsDevServer } from "./widgetsDevServer.js";

export async function setupDevHarness(
  app: express.Express,
  httpServer: http.Server,
): Promise<void> {
  const bridge = new ScreenshotBridge();
  app.use(bridge.createExpressRouter());

  const port = process.env.PORT ?? "3000";
  const host = process.env.HOST ?? "localhost";
  const devtoolsMcpUrl = `http://${host}:${port}/mcp-devtools`;
  app.use("/mcp-devtools", createDevtoolsMcpRouter(bridge));

  const { port: claudeWsPort } = createClaudeSessionServer({
    cwd: process.cwd(),
    devtoolsMcpUrl,
  });

  app.use(await devtoolsStaticServer({ claudeWsPort }));
  app.use(await widgetsDevServer(httpServer));
}

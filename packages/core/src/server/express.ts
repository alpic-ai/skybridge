import type http from "node:http";
import path from "node:path";
import { toNodeHandler } from "@modelcontextprotocol/node";
import {
  createMcpHandler,
  type McpHttpHandler,
  UnsupportedProtocolVersionError,
} from "@modelcontextprotocol/server";
import cors from "cors";
import express from "express";
import type { Skybridge } from "./app.js";
import type { JsonOptions } from "./server.js";

type SkybridgeApp = Pick<
  Skybridge,
  "express" | "createServerInstance" | "ready"
>;

/**
 * The `/mcp` fetch handler for a {@link Skybridge} app: a `Request` →
 * `Response` function that builds a fresh MCP server per request.
 *
 * @internal
 */
export function buildMcpHandler(skybridgeApp: SkybridgeApp): McpHttpHandler {
  return createMcpHandler(() => skybridgeApp.createServerInstance(), {
    onerror: (error) => {
      if (error instanceof UnsupportedProtocolVersionError) {
        return;
      }
      console.error("Error handling MCP request:", error);
    },
  });
}

/**
 * Build the bare Express app a {@link Skybridge} instance owns: the instance
 * plus the built-in `express.json()` body parser, tuned by the `json` config
 * field.
 *
 * @internal
 */
export function createBaseApp(json?: JsonOptions): express.Express {
  const app = express();
  app.use(express.json(json));
  return app;
}

function parseControlPort(raw: string | undefined): number | null {
  if (raw === undefined) {
    return null;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0 || n >= 65536) {
    return null;
  }
  return n;
}

function applyMiddlewares(
  app: express.Express,
  middlewares: Array<{
    path?: string;
    handlers: express.ErrorRequestHandler[];
  }>,
): void {
  for (const middleware of middlewares) {
    if (middleware.path) {
      app.use(middleware.path, ...middleware.handlers);
    } else {
      app.use(...middleware.handlers);
    }
  }
}

function defaultErrorHandler(
  err: unknown,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction,
) {
  console.error("Error handling MCP request:", err);
  if (!res.headersSent) {
    res.status(500).json({
      jsonrpc: "2.0",
      error: { code: -32603, message: "Internal server error" },
      id: null,
    });
  }
}

export async function createApp({
  app: skybridgeApp,
  httpServer,
  mcpHandler,
  errorMiddleware = [],
}: {
  app: SkybridgeApp;
  httpServer: http.Server;
  mcpHandler?: McpHttpHandler;
  errorMiddleware?: {
    path?: string;
    handlers: express.ErrorRequestHandler[];
  }[];
}): Promise<express.Express> {
  await skybridgeApp.ready();
  const app = skybridgeApp.express;

  // Read `process.env.NODE_ENV` inline: wrangler/esbuild only substitute the literal expression,
  // so a local const would defeat dead-code elimination of the dev-only imports below.
  if (process.env.NODE_ENV !== "production") {
    const { devtoolsStaticServer } = await import("@skybridge/devtools");
    app.use(await devtoolsStaticServer());
    const { viewsDevServer } = await import("./viewsDevServer.js");
    app.use(await viewsDevServer(httpServer));

    const controlPort = parseControlPort(process.env.__TUNNEL_CONTROL_PORT);
    if (controlPort !== null) {
      const { createTunnelProxyRouter } = await import(
        "./tunnel-proxy-router.js"
      );
      app.use(createTunnelProxyRouter(controlPort));
    } else if (process.env.__TUNNEL_CONTROL_PORT !== undefined) {
      console.warn(
        `Ignoring invalid __TUNNEL_CONTROL_PORT=${process.env.__TUNNEL_CONTROL_PORT}`,
      );
    }
  } else {
    const assetsPath = path.join(process.cwd(), "dist", "assets");

    app.use("/assets", cors());
    app.use("/assets", express.static(assetsPath));
  }

  app.use("/mcp", mcpMiddleware(mcpHandler ?? buildMcpHandler(skybridgeApp)));

  applyMiddlewares(app, errorMiddleware);

  app.use("/mcp", defaultErrorHandler);

  return app;
}

const mcpMiddleware = (mcpHandler: McpHttpHandler): express.RequestHandler => {
  const handler = toNodeHandler(mcpHandler);

  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      // Express strips the mount path from req.url (e.g. "/mcp" becomes "/").
      // Restore it so the SDK builds the correct request URL.
      req.url = req.originalUrl;
      await handler(req, res, req.body);
    } catch (error) {
      next(error);
    }
  };
};

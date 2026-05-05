import type http from "node:http";
import path from "node:path";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import express from "express";
import type { McpServer } from "./server.js";

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
  mcpServer,
  httpServer,
  errorMiddleware = [],
}: {
  mcpServer: McpServer;
  httpServer: http.Server;
  errorMiddleware?: {
    path?: string;
    handlers: express.ErrorRequestHandler[];
  }[];
}): Promise<express.Express> {
  const app = mcpServer.express;

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

  app.use("/mcp", mcpMiddleware(mcpServer));

  applyMiddlewares(app, errorMiddleware);

  app.use("/mcp", defaultErrorHandler);

  return app;
}

const mcpMiddleware = (server: McpServer): express.RequestHandler => {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (req.method !== "POST") {
      res.writeHead(405).end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Method not allowed.",
          },
          id: null,
        }),
      );
      return;
    }

    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        // Respond with a single JSON body instead of SSE. Skybridge's stateless
        // transport never streams server-initiated messages, so SSE adds no
        // capability — and on workerd specifically, `cloudflare:node`'s http
        // bridge silently drops chunked writes that happen after the request
        // handler awaits, which manifests as a 200 with empty body for any
        // async tools/call.
        enableJsonResponse: true,
      });

      res.on("close", () => {
        transport.close();
      });

      await server.connectStatelessTransport(transport);
      // Express strips the mount path from req.url (e.g. "/mcp" becomes "/").
      // Restore it so the SDK builds the correct requestInfo.url.
      req.url = req.originalUrl;
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      next(error);
    }
  };
};

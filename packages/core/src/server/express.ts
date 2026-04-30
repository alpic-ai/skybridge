import type http from "node:http";
import path from "node:path";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import express from "express";
import type { McpServer } from "./server.js";

// Global registry of active shutdown callbacks. We register the SIGINT/SIGTERM
// handlers exactly once per process so repeated `createApp` calls (notably in
// tests) do not accumulate listeners and trip the MaxListenersExceeded warning.
//
// After running shutdowns we remove ourselves and re-raise the signal so
// Node's default termination behavior kicks in — without this the process
// would keep running because our listener replaces the default exit-on-signal.
const tunnelShutdowns = new Set<() => void>();
let signalHandlersRegistered = false;
function ensureSignalHandlers(): void {
  if (signalHandlersRegistered) {
    return;
  }
  signalHandlersRegistered = true;
  const fire = (signal: NodeJS.Signals) => {
    for (const cb of tunnelShutdowns) {
      cb();
    }
    process.off("SIGINT", fire);
    process.off("SIGTERM", fire);
    process.kill(process.pid, signal);
  };
  process.on("SIGINT", fire);
  process.on("SIGTERM", fire);
}

function applyMiddlewares(
  app: express.Express,
  middlewares: Array<{
    path?: string;
    handlers: Array<express.RequestHandler | express.ErrorRequestHandler>;
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
  customMiddleware = [],
  errorMiddleware = [],
}: {
  mcpServer: McpServer;
  httpServer: http.Server;
  customMiddleware?: { path?: string; handlers: express.RequestHandler[] }[];
  errorMiddleware?: {
    path?: string;
    handlers: express.ErrorRequestHandler[];
  }[];
}): Promise<express.Express> {
  const app = express();
  app.use(express.json());
  const env = process.env.NODE_ENV || "development";

  applyMiddlewares(app, customMiddleware);

  if (env !== "production") {
    const { devtoolsStaticServer } = await import("@skybridge/devtools");
    app.use(await devtoolsStaticServer());
    const { viewsDevServer } = await import("./viewsDevServer.js");
    app.use(await viewsDevServer(httpServer));

    const { TunnelManager } = await import("./tunnel.js");
    const { createTunnelRouter } = await import("./tunnelRouter.js");
    const tunnelManager = new TunnelManager({
      getPort: () => {
        const addr = httpServer.address();
        if (typeof addr === "string" || addr === null) {
          throw new Error("Cannot resolve dev server port");
        }
        return addr.port;
      },
    });
    app.use(createTunnelRouter(tunnelManager));

    const shutdown = () => tunnelManager.stop();
    tunnelShutdowns.add(shutdown);
    httpServer.once("close", () => {
      shutdown();
      tunnelShutdowns.delete(shutdown);
    });
    ensureSignalHandlers();
  }

  if (env === "production") {
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

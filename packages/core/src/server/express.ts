import type http from "node:http";
import path from "node:path";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import express from "express";
import type { McpServer } from "./server";

export async function createApp({
  mcpServer,
  httpServer,
  customMiddleware = [],
}: {
  mcpServer: McpServer;
  httpServer: http.Server;
  customMiddleware?: { path?: string; handlers: express.RequestHandler[] }[];
}): Promise<express.Express> {
  const env = process.env.NODE_ENV || "development";

  const app = express();
  app.use(express.json());

  for (const middleware of customMiddleware) {
    if (middleware.path) {
      app.use(middleware.path, ...middleware.handlers);
    } else {
      app.use(...middleware.handlers);
    }
  }

  if (env !== "production") {
    const { setupDevMiddleware } = await import("./dev-middleware.js");
    await setupDevMiddleware(app, httpServer, {
      claude: process.env.__CLAUDE_HARNESS === "true",
    });
  }

  if (env === "production") {
    const assetsPath = path.join(process.cwd(), "dist", "assets");

    app.use("/assets", cors());
    app.use("/assets", express.static(assetsPath));
  }

  app.use("/mcp", mcpMiddleware(mcpServer));

  return app;
}

const mcpMiddleware = (server: McpServer): express.RequestHandler => {
  return async (
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
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

      await server.connect(transport);
      // Express strips the mount path from req.url (e.g. "/mcp" becomes "/").
      // Restore it so the SDK builds the correct requestInfo.url.
      req.url = req.originalUrl;
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  };
};

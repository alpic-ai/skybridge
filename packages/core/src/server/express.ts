import path from "node:path";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import express from "express";
import type { McpServer } from "./server";

export async function createServer({
  server,
  customMiddleware = [],
}: {
  server: McpServer;
  customMiddleware?: { path?: string; handlers: express.RequestHandler[] }[];
}): Promise<express.Express> {
  const app = express();
  app.use(express.json());
  const env = process.env.NODE_ENV || "development";

  if (env !== "production") {
    const { devtoolsStaticServer } = await import("@skybridge/devtools");
    app.use(await devtoolsStaticServer());
    const { widgetsDevServer } = await import("./widgetsDevServer.js");
    app.use(await widgetsDevServer());
  }

  if (env === "production") {
    const assetsPath = path.join(process.cwd(), "dist", "assets");

    app.use("/assets", cors());
    app.use("/assets", express.static(assetsPath));
  }

  for (const middleware of customMiddleware) {
    if (middleware.path) {
      app.use(middleware.path, ...middleware.handlers);
    } else {
      app.use(...middleware.handlers);
    }
  }

  app.use("/mcp", mcpMiddleware(server));

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

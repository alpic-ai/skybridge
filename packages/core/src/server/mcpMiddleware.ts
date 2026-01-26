import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { RequestHandler } from "express";
import type { McpServer } from "../server/server.js";

/**
 * Creates Express middleware for handling MCP requests
 */
export function createMcpMiddleware(server: McpServer): RequestHandler {
  return async (req, res, next) => {
    // Only handle requests to the /mcp path
    if (req.path !== "/mcp") {
      return next();
    }

    if (req.method === "POST") {
      try {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });

        res.on("close", () => {
          transport.close();
        });

        await server.connect(transport);

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
    } else if (req.method === "GET" || req.method === "DELETE") {
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
    } else {
      next();
    }
  };
}

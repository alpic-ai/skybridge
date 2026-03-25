import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  type NextFunction,
  type Request,
  type Response,
  Router,
} from "express";
import type { ScreenshotBridge } from "./screenshot-bridge.js";

export function createDevtoolsMcpRouter(bridge: ScreenshotBridge): Router {
  const server = new McpServer({
    name: "skybridge-devtools",
    version: "1.0.0",
  });

  server.registerTool(
    "take_screenshot",
    {
      description:
        "Capture a screenshot of the Skybridge devtools renderend widget. Returns the image so you can reason about the current state of the app.",
    },
    async () => {
      try {
        const dataUrl = await bridge.requestScreenshot();
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
        return {
          content: [{ type: "image", data: base64, mimeType: "image/png" }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: (err as Error).message }],
        };
      }
    },
  );

  const router = Router();

  router.post("/", async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      res.on("close", () => transport.close());
      await server.connect(transport);
      req.url = req.originalUrl;
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Error handling devtools MCP request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  return router;
}

import type { Server } from "node:http";
import path from "node:path";
import cors from "cors";
import express, { type RequestHandler } from "express";
import type { HmrOptions } from "vite";

export interface WidgetsDevServerOptions {
  /**
   * Tunnel hostname for remote development (e.g., ngrok, cloudflare tunnel).
   * When set, configures HMR to use wss:// on port 443.
   *
   * @example "your-subdomain.trycloudflare.com"
   */
  tunnelHost?: string;

  /**
   * Node HTTP server to attach HMR WebSocket to.
   * Required when using `tunnelHost` so HMR WebSocket goes through the tunnel.
   *
   * @example
   * ```ts
   * const httpServer = http.createServer(app);
   * app.use(await widgetsDevServer({ tunnelHost, hmrServer: httpServer }));
   * ```
   */
  hmrServer?: Server;
}

/**
 * Create Vite dev server middleware for widget development.
 *
 * @example Basic usage (local development)
 * ```ts
 * app.use(await widgetsDevServer());
 * app.listen(3000);
 * ```
 *
 * @example With tunnel support (ngrok, cloudflare tunnel)
 * ```ts
 * import http from "node:http";
 *
 * const tunnelHost = process.env.TUNNEL_HOST;
 * const httpServer = http.createServer(app);
 * app.use(await widgetsDevServer({ tunnelHost, hmrServer: httpServer }));
 * httpServer.listen(3000);
 * ```
 */
export const widgetsDevServer = async (
  options: WidgetsDevServerOptions = {},
): Promise<RequestHandler> => {
  const { tunnelHost, hmrServer } = options;
  const router = express.Router();

  const { createServer, searchForWorkspaceRoot, loadConfigFromFile } =
    await import("vite");
  const workspaceRoot = searchForWorkspaceRoot(process.cwd());
  const webAppRoot = path.join(workspaceRoot, "web");

  const configResult = await loadConfigFromFile(
    { command: "serve", mode: "development" },
    path.join(webAppRoot, "vite.config.ts"),
    webAppRoot,
  );

  // biome-ignore lint/correctness/noUnusedVariables: Remove build-specific options that don't apply to dev server
  const { build, preview, ...devConfig } = configResult?.config || {};

  // Configure HMR for tunnel support when tunnelHost is provided.
  // This attaches the WebSocket to the same HTTP server (port 3000),
  // so HMR traffic goes through the tunnel instead of a separate port.
  let hmrOptions: HmrOptions | undefined;
  if (tunnelHost && hmrServer) {
    hmrOptions = {
      server: hmrServer,
      protocol: "wss",
      clientPort: 443,
    };
  }

  const vite = await createServer({
    ...devConfig,
    configFile: false, // Keep this to prevent vite from trying to resolve path in the target config file
    appType: "custom",
    server: {
      hmr: hmrOptions,
      allowedHosts: true,
      middlewareMode: true,
    },
    root: webAppRoot,
    optimizeDeps: {
      include: ["react", "react-dom/client"],
    },
  });

  router.use(cors());
  router.use("/", vite.middlewares);

  return router;
};

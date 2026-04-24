import type http from "node:http";
import path from "node:path";
import cors from "cors";
import express, { type Router } from "express";
import { assetBaseUrlTransformPlugin } from "./asset-base-url-transform-plugin.js";

/**
 * Vite dev-server middleware for widget assets.
 *
 * MUST be mounted at the Express app root so Vite can intercept
 * `/@vite/client`, `/@react-refresh`, and `/_skybridge/widget/...` imports:
 *
 *   const app = express();
 *   if (env.NODE_ENV !== "production") {
 *     app.use(await widgetsDevServer(httpServer));
 *   }
 */
export const widgetsDevServer = async (
  httpServer: http.Server,
): Promise<Router> => {
  const router = express.Router();

  const { createServer, loadConfigFromFile } = await import("vite");

  const root = process.cwd();
  const configFile = path.join(root, "vite.config.ts");

  const configResult = await loadConfigFromFile(
    { command: "serve", mode: "development" },
    configFile,
    root,
  );

  const {
    build,
    preview,
    plugins: userPlugins = [],
    ...devConfig
  } = configResult?.config || {};

  const vite = await createServer({
    ...devConfig,
    // Pass `false` so Vite skips re-resolving a config file — we already
    // loaded and spread the user's config above.
    configFile: false,
    appType: "custom",
    server: {
      allowedHosts: true,
      middlewareMode: true,
      hmr: {
        server: httpServer,
      },
    },
    root,
    // optimizeDeps is set by the skybridge Vite plugin (entries + include)
    // so it can derive the widget glob from `widgetsDir`.
    plugins: [...userPlugins, assetBaseUrlTransformPlugin()],
  });

  router.use(cors());
  router.use("/", vite.middlewares);

  return router;
};

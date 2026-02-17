import { existsSync } from "node:fs";
import path from "node:path";
import cors from "cors";
import express, { type Router } from "express";
import { assetBaseUrlTransformPlugin } from "./asset-base-url-transform-plugin.js";

/**
 * Install Vite dev server
 * This router MUST be installed at the application root, like so:
 *
 *  const app = express();
 *
 * if (env.NODE_ENV !== "production") {
 *   app.use(await widgetsRouter());
 * }
 */
export const widgetsDevServer = async (): Promise<Router> => {
  const router = express.Router();

  const { createServer, searchForWorkspaceRoot, loadConfigFromFile } =
    await import("vite");

  // Since 0.16.0, the template is a single package that does not rely on workspace.
  // It means that, when starting the server, the working dir is the template root
  // hence we don't need to walk up the tree to find the workspace, which does not exist anymore.
  let webAppRoot = path.join(process.cwd(), "web");

  // fallback to the old behavior for backward compatibility
  const hasWebAppRoot = existsSync(webAppRoot);
  if (!hasWebAppRoot) {
    const workspaceRoot = searchForWorkspaceRoot(process.cwd());
    webAppRoot = path.join(workspaceRoot, "web");
  }

  const configResult = await loadConfigFromFile(
    { command: "serve", mode: "development" },
    path.join(webAppRoot, "vite.config.ts"),
    webAppRoot,
  );

  const {
    build,
    preview,
    plugins: userPlugins = [],
    ...devConfig
  } = configResult?.config || {};

  const vite = await createServer({
    ...devConfig,
    configFile: false, // Keep this to prevent vite from trying to resolve path in the target config file
    appType: "custom",
    server: {
      allowedHosts: true,
      middlewareMode: true,
      hmr: {
        protocol: "ws",
        host: "localhost",
        port: 24678,
      },
    },
    root: webAppRoot,
    optimizeDeps: {
      include: ["react", "react-dom/client"],
    },
    plugins: [
      ...userPlugins,
      assetBaseUrlTransformPlugin({
        devServerOrigin: `http://localhost:${process.env.SKYBRIDGE_PORT ?? "3000"}`,
      }),
    ],
  });

  router.use(cors());
  router.use("/", vite.middlewares);

  return router;
};

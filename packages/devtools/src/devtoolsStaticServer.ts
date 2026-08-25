import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express, { type Router } from "express";
import { createDeployRouter } from "./deploy-router.js";

type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

const detectPackageManager = (): PackageManager => {
  const userAgent = process.env.npm_config_user_agent ?? "";
  if (userAgent.startsWith("pnpm")) {
    return "pnpm";
  }
  if (userAgent.startsWith("yarn")) {
    return "yarn";
  }
  if (userAgent.startsWith("bun")) {
    return "bun";
  }
  return "npm";
};

const detectSkybridgeVersion = (): string | undefined => {
  try {
    const require = createRequire(path.join(process.cwd(), "package.json"));
    const entry = require.resolve("skybridge/server");
    const packageRoot = entry.slice(0, entry.lastIndexOf(`${path.sep}dist`));
    const manifest = readFileSync(
      path.join(packageRoot, "package.json"),
      "utf8",
    );
    return (JSON.parse(manifest) as { version?: string }).version;
  } catch {
    return undefined;
  }
};

/**
 * Serve the built devtools React app
 * This router serves static files from the devtools's dist directory.
 *
 * It should be installed at the application root, like so:
 *
 *  const app = express();
 *
 * if (env.NODE_ENV !== "production") {
 *   app.use(await devtoolsStaticServer(server));
 *   app.use(await viewsDevServer());
 *                     ^^^^^^^^ Make sure to install the devtoolsStaticServer before the viewsDevServer
 * }
 */
export const devtoolsStaticServer = async (): Promise<Router> => {
  const router = express.Router();
  const skybridgeVersion = detectSkybridgeVersion();

  const distDir = path.dirname(fileURLToPath(import.meta.url));

  router.use(cors());
  router.get("/__skybridge/devtools/project", (_req, res) => {
    res.json({ packageManager: detectPackageManager(), skybridgeVersion });
  });
  router.use(createDeployRouter());
  router.use(express.static(distDir));
  router.get("/", (_req, res, next) => {
    const indexHtmlPath = path.join(distDir, "index.html");
    res.sendFile(indexHtmlPath, (error) => {
      if (error) {
        next(error);
      }
    });
  });

  return router;
};

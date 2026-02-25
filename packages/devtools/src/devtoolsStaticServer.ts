import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express, { type Router } from "express";

export interface DevtoolsStaticServerOptions {
  claudeWsPort?: number;
}

/**
 * Serve the built devtools React app
 * This router serves static files from the devtools's dist directory.
 *
 * It should be installed at the application root, like so:
 *
 *  const app = express();
 *
 * if (env.NODE_ENV !== "production") {
 *   app.use(await devtoolsStaticServer({ claudeWsPort: 3001 }));
 *   app.use(await widgetsDevServer());
 *                     ^^^^^^^^ Make sure to install the devtoolsStaticServer before the widgetsDevServer
 * }
 */
export const devtoolsStaticServer = async (
  options: DevtoolsStaticServerOptions = {},
): Promise<Router> => {
  const router = express.Router();

  const distDir = path.dirname(fileURLToPath(import.meta.url));
  const claudeWsPort = options.claudeWsPort ?? 3001;

  const indexHtmlPath = path.join(distDir, "index.html");
  const rawHtml = readFileSync(indexHtmlPath, "utf-8");
  const injectedHtml = rawHtml.replace(
    "</head>",
    `<script>window.__CLAUDE_WS_PORT__=${claudeWsPort};</script></head>`,
  );

  router.use(cors());
  router.use(express.static(distDir));
  router.get("/", (_req, res) => {
    res.send(injectedHtml);
  });

  return router;
};

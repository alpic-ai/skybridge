import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express, { type RequestHandler } from "express";

/**
 * Serve the built devtools React app
 * This router serves static files from the devtools's dist directory.
 * It should be installed at the application root, like so:
 *
 *  const app = express();
 *
 * if (env.NODE_ENV !== "production") {
 *   app.use(await devtoolsStaticServer(server));
 *   app.use(await widgetsDevServer());
 *                     ^^^^^^^^ Make sure to install the devtoolsStaticServer before the widgetsDevServer
 * }
 */
export const devtoolsStaticServer = async (): Promise<RequestHandler> => {
  const router = express.Router();
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const devtoolsPath = path.join(currentDir, "..", "devtools");

  router.use(cors());

  router.use(express.static(devtoolsPath));

  router.get("/", (_req, res, next) => {
    const indexHtmlPath = path.join(devtoolsPath, "index.html");
    try {
      const indexHtml = readFileSync(indexHtmlPath, "utf-8");
      res.setHeader("Content-Type", "text/html");
      res.send(indexHtml);
    } catch (error) {
      next(error);
    }
  });

  return router;
};

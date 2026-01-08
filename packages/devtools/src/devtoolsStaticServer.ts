import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express, { type Router } from "express";

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
 *   app.use(await widgetsDevServer());
 *                     ^^^^^^^^ Make sure to install the devtoolsStaticServer before the widgetsDevServer
 * }
 */
export const devtoolsStaticServer = async (): Promise<Router> => {
  const router = express.Router();

  const distDir = path.dirname(fileURLToPath(import.meta.url));

  router.use(cors());
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

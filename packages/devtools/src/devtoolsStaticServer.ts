import { createRequire } from "node:module";
import path from "node:path";
import cors from "cors";
import express, { type RequestHandler } from "express";

const require = createRequire(import.meta.url);

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
export const devtoolsStaticServer = async (): Promise<RequestHandler> => {
  const router = express.Router();
  let devtoolsPath: string;
  if (!require.main) {
    throw new Error("require.main is not set");
  }
  devtoolsPath = path.join(path.dirname(require.main.filename), "dist");

  router.use(cors());
  router.use(express.static(devtoolsPath));
  router.get("/", (_req, res, next) => {
    const indexHtmlPath = path.join(devtoolsPath, "index.html");
    res.sendFile(indexHtmlPath, (error) => {
      if (error) {
        next(error);
      }
    });
  });

  return router;
};

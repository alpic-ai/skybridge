import { createRequire } from "node:module";
import path from "node:path";
import cors from "cors";
import express, { type RequestHandler } from "express";

const require = createRequire(import.meta.url);

/**
 * Serve the built devtools React app
 * This router serves static files from the devtools's dist directory.
 *
 * **Note:** This requires `@skybridge/devtools` to be installed as a peer dependency.
 * Install it with: `pnpm add -D @skybridge/devtools` (or `npm install -D @skybridge/devtools`)
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
  try {
    const devtoolsPackagePath = require.resolve(
      "@skybridge/devtools/package.json",
    );
    devtoolsPath = path.join(path.dirname(devtoolsPackagePath), "dist");
  } catch (error) {
    throw new Error(
      "@skybridge/devtools is not installed. Please install it as a dev dependency:\n" +
        "  pnpm add -D @skybridge/devtools\n" +
        "  or\n" +
        "  npm install -D @skybridge/devtools",
      { cause: error },
    );
  }

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

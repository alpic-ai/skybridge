import cors from "cors";
import express, { type RequestHandler } from "express";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Serve the built emulator React app
 * This router serves static files from the emulator's dist directory.
 * It should be installed at the application root, like so:
 *
 *  const app = express();
 *
 * if (env.NODE_ENV !== "production") {
 *   app.use(await emulatorStaticServer(server));
 *   app.use(await widgetsDevServer());
 *                     ^^^^^^^^ Make sure to install the emulatorStaticServer before the widgetsDevServer
 * }
 */
export const emulatorStaticServer = async (): Promise<RequestHandler> => {
  const router = express.Router();
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const emulatorPath = path.join(currentDir, "..", "emulator");

  router.use(cors());

  router.use(express.static(emulatorPath));

  router.get("/", (_req, res, next) => {
    const indexHtmlPath = path.join(emulatorPath, "index.html");
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

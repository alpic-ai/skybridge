import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { skybridge } from "skybridge/vite";
import { defineConfig, type Plugin } from "vite";

/**
 * Reads HTML files from ../assets/, replaces %KEY% placeholders with
 * Vite env vars, and emits them into the build output.
 */
function staticHtmlPlugin(): Plugin {
  const assetsDir = path.resolve(__dirname, "../assets");
  let resolvedEnv: Record<string, string>;

  return {
    name: "static-html",
    configResolved(config) {
      resolvedEnv = config.env;
    },
    configureServer(server) {
      server.middlewares.use("/assets", (req, res, next) => {
        const file = req.url?.split("?")[0] ?? "";
        const filePath = path.join(assetsDir, file);
        if (!fs.existsSync(filePath)) return next();
        if (file.endsWith(".html")) {
          let html = fs.readFileSync(filePath, "utf-8");
          html = html.replace(/%(\w+)%/g, (match, key) => resolvedEnv[key] ?? match);
          res.setHeader("Content-Type", "text/html");
          res.end(html);
        } else {
          res.setHeader("Content-Type", "application/octet-stream");
          res.end(fs.readFileSync(filePath));
        }
      });
    },
    generateBundle() {
      const files = fs.readdirSync(assetsDir);
      for (const file of files) {
        const filePath = path.join(assetsDir, file);
        if (file.endsWith(".html")) {
          let html = fs.readFileSync(filePath, "utf-8");
          html = html.replace(/%(\w+)%/g, (match, key) => {
            return resolvedEnv[key] ?? match;
          });
          this.emitFile({ type: "asset", fileName: file, source: html });
        } else {
          const source = fs.readFileSync(filePath);
          this.emitFile({ type: "asset", fileName: file, source });
        }
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [skybridge(), react(), staticHtmlPlugin()],
  root: __dirname,
  envDir: path.resolve(__dirname, ".."),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

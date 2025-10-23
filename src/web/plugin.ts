import { globSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

export function skybridge(): Plugin {
  return {
    name: "skybridge",

    config() {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const input = Object.fromEntries(
        globSync("src/widgets/*.{js,ts,jsx,tsx,html}").map((file) => [
          file.match(/^src\/widgets\/(.+)\.tsx$/)?.[1] ?? file.slice(10, -3),
          resolve(__dirname, file),
        ])
      );

      return {
        build: {
          minify: true,
          cssCodeSplit: false,
          rollupOptions: {
            input,
            output: {
              entryFileNames: "[name].js",
              assetFileNames: "[name][extname]",
            },
          },
        },
      };
    },
  };
}

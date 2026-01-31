import type { Plugin } from "vite";
import { transform as dataLlmTransform } from "./transform-data-llm.js";

export function skybridge(): Plugin {
  return {
    name: "skybridge",

    async config(config) {
      // Dynamic imports to ensure Node modules are only loaded in Node.js context
      const { globSync } = await import("node:fs");
      const { basename, dirname, parse, resolve } = await import("node:path");

      const projectRoot = config.root || process.cwd();
      const flatWidgetPattern = resolve(
        projectRoot,
        "src/widgets/*.{js,ts,jsx,tsx,html}",
      );
      const dirWidgetPattern = resolve(projectRoot, "src/widgets/*/index.tsx");

      const flatWidgets = globSync(flatWidgetPattern).map((file) => {
        const name = parse(file).name;
        return [name, file];
      });
      const dirWidgets = globSync(dirWidgetPattern).map((file) => {
        const name = basename(dirname(file));
        return [name, file];
      });
      const input = Object.fromEntries([...flatWidgets, ...dirWidgets]);

      return {
        base: "/assets",
        build: {
          manifest: true,
          minify: true,
          cssCodeSplit: false,
          rollupOptions: {
            input,
          },
        },
        experimental: {
          renderBuiltUrl: (filename) => {
            return {
              runtime: `window.skybridge.serverUrl + "/assets/${filename}"`,
            };
          },
        },
      };
    },
    enforce: "pre",
    async transform(code, id) {
      return await dataLlmTransform(code, id);
    },
  };
}

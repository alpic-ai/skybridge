import type { Plugin } from "vite";

export function skybridge(): Plugin {
  return {
    name: "skybridge",

    async config(config) {
      // Dynamic imports to ensure Node modules are only loaded in Node.js context
      const { globSync } = await import("node:fs");
      const { resolve } = await import("node:path");

      const projectRoot = config.root || process.cwd();
      const widgetsPattern = resolve(
        projectRoot,
        "src/widgets/*.{js,ts,jsx,tsx,html}"
      );

      const input = Object.fromEntries(
        globSync(widgetsPattern).map((file) => [
          file.match(/src\/widgets\/(.+)\.tsx$/)?.[1],
          file,
        ])
      );

      return {
        base: "/assets",
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

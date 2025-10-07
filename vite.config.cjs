import { resolve } from "node:path";
import { defineConfig } from "vite";

module.exports = defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "skybridge",
      fileName: "skybridge",
    },
    rollupOptions: {
      external: ["react"],
      output: {
        globals: {
          react: "React",
        },
      },
    },
  },
});

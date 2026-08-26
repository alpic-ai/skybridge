import path from "node:path";
import { skybridge } from "@skybridge/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [skybridge(), react()],
  root: __dirname,
  cacheDir: path.resolve(
    __dirname,
    `../../../node_modules/.vite-fixture-${process.env.__PORT ?? "dev"}`,
  ),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

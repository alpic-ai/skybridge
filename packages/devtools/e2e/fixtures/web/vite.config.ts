import path from "node:path";
import react from "@vitejs/plugin-react";
import { skybridge } from "skybridge/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [skybridge(), react()],
  root: import.meta.dirname,
  cacheDir: path.resolve(
    import.meta.dirname,
    `../../../node_modules/.vite-fixture-${process.env.__PORT ?? "dev"}`,
  ),
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});

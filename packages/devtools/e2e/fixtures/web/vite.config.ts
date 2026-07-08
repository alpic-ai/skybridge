import path from "node:path";
import react from "@vitejs/plugin-react";
import { skybridge } from "skybridge/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [skybridge(), react()],
  root: __dirname,
  cacheDir: path.resolve(__dirname, `.vite-${process.env.__PORT ?? "dev"}`),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

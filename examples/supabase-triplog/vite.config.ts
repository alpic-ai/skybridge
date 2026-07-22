import path from "node:path";
import react from "@vitejs/plugin-react";
import { skybridge } from "skybridge/vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    forwardConsole: {
      unhandledErrors: true,
      logLevels: ["error"],
    },
  },
  plugins: [skybridge(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

import path from "node:path";
import { skybridge } from "@skybridge/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  server: {
    forwardConsole: {
      unhandledErrors: true,
      logLevels: ["error"],
    },
  },
  plugins: [skybridge({ evals: {} }), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

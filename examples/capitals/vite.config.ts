import path from "node:path";
import { skybridge } from "@skybridge/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { PluginOption } from "vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  server: {
    forwardConsole: {
      unhandledErrors: true,
      logLevels: ["error"],
    },
  },
  plugins: [skybridge({ evals: {} }) as PluginOption, react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

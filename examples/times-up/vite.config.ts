import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { skybridge } from "skybridge/vite";
import { defineConfig, type PluginOption } from "vite";

// https://vite.dev/config/
export default defineConfig({
  server: {
    forwardConsole: {
      unhandledErrors: true,
      logLevels: ["error"],
    },
  },
  plugins: [skybridge() as PluginOption, tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

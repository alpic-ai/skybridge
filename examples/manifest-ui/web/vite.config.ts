import path from "node:path";
import react from "@vitejs/plugin-react";
import { skybridge } from "skybridge/vite";
import { defineConfig, type PluginOption } from "vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [skybridge() as PluginOption, react(), tailwindcss()],
  root: __dirname,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

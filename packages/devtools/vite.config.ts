import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/__skybridge": {
        target: new URL(
          process.env.VITE_MCP_SERVER_URL || "http://localhost:3000",
        ).origin,
        changeOrigin: true,
      },
    },
  },
});

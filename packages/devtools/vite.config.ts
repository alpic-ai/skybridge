import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

function claudeSessionPlugin(): Plugin {
  return {
    name: "claude-session-server",
    apply: "serve",
    async buildStart() {
      const { createClaudeSessionServer } = await import(
        "./src/server/claude-session-server.js"
      );
      const { port } = createClaudeSessionServer({ cwd: process.cwd() });
      console.log(`[claude-session] WebSocket server listening on ws://localhost:${port}`);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), claudeSessionPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

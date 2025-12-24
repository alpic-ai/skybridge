import react from "@vitejs/plugin-react";
import { skybridge } from "skybridge/web";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), skybridge()],
  server: {
    port: 3000,
  },
});

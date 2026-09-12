import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { skybridge } from "skybridge/vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), skybridge()],
});

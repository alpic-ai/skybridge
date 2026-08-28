import { skybridge } from "@skybridge/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [skybridge()],
  server: {
    forwardConsole: {
      unhandledErrors: true,
      logLevels: ["error"],
    },
  },
});

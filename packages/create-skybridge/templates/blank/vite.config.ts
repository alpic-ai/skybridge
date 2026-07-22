import { skybridge } from "skybridge/vite";
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

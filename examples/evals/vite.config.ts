import { skybridge } from "@skybridge/vite-plugin";
import type { PluginOption } from "vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    skybridge({
      evals: {
        temperature: 0,
        maxSteps: 6,
        timeout: 180_000,
      },
    }) as PluginOption,
  ],
});

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { evals } from "./src/plugin.js";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

export default defineConfig({
  plugins: [
    evals({
      model: { provider: "anthropic", name: "claude-haiku-4-5" },
      temperature: 0,
      project: {
        cwd: fileURLToPath(
          new URL("../../examples/ecom-carousel", import.meta.url),
        ),
        command: ["./node_modules/.bin/tsx", "src/server.ts"],
      },
    }),
  ],
  test: {
    include: ["evals/**/*.eval.ts"],
  },
});

import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

export default defineConfig({
  test: {
    include: ["evals/**/*.eval.ts"],
    globalSetup: ["src/global-setup.ts"],
    fileParallelism: false,
    hookTimeout: 120_000,
  },
});

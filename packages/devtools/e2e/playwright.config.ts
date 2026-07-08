import { defineConfig, devices } from "@playwright/test";
import {
  DEVTOOLS_AUTH_PORT,
  DEVTOOLS_MIXED_AUTH_PORT,
  DEVTOOLS_PORT,
  FIXTURE_AUTH_PORT,
  FIXTURE_MIXED_AUTH_PORT,
  FIXTURE_PORT,
} from "./fixtures/ports.js";

const fixture = (port: number, args = "") => ({
  command: `pnpm e2e:fixture${args ? ` ${args}` : ""}`,
  port,
  reuseExistingServer: !process.env.CI,
  env: { __PORT: String(port) },
  stdout: "pipe" as const,
  stderr: "pipe" as const,
  timeout: 60_000,
});

const devtools = (port: number, fixturePort: number) => ({
  command: `pnpm dev -- --port ${port} --strictPort`,
  port,
  reuseExistingServer: !process.env.CI,
  env: {
    VITE_MCP_SERVER_URL: `http://localhost:${fixturePort}/mcp`,
    DEVTOOLS_VITE_CACHE_DIR: `node_modules/.vite-e2e-${port}`,
  },
  stdout: "pipe" as const,
  stderr: "pipe" as const,
  timeout: 60_000,
});

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${DEVTOOLS_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    fixture(FIXTURE_PORT),
    fixture(FIXTURE_AUTH_PORT, "--auth"),
    fixture(FIXTURE_MIXED_AUTH_PORT, "--auth --optional"),
    devtools(DEVTOOLS_PORT, FIXTURE_PORT),
    devtools(DEVTOOLS_AUTH_PORT, FIXTURE_AUTH_PORT),
    devtools(DEVTOOLS_MIXED_AUTH_PORT, FIXTURE_MIXED_AUTH_PORT),
  ],
});

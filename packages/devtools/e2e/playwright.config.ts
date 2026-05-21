import { defineConfig, devices } from "@playwright/test";

const FIXTURE_PORT = 4101;
const DEVTOOLS_PORT = 5173;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${DEVTOOLS_PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm e2e:fixture",
      port: FIXTURE_PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        __PORT: String(FIXTURE_PORT),
      },
      stdout: "pipe",
      stderr: "pipe",
      timeout: 60_000,
    },
    {
      command: `pnpm dev -- --port ${DEVTOOLS_PORT} --strictPort`,
      port: DEVTOOLS_PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_MCP_SERVER_URL: `http://localhost:${FIXTURE_PORT}/mcp`,
      },
      stdout: "pipe",
      stderr: "pipe",
      timeout: 60_000,
    },
  ],
});

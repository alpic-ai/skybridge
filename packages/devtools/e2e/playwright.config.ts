import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:5173",
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
      port: 4101,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      timeout: 60_000,
    },
    {
      command: "pnpm dev -- --port 5173 --strictPort",
      port: 5173,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_MCP_SERVER_URL: "http://localhost:4101/mcp",
      },
      stdout: "pipe",
      stderr: "pipe",
      timeout: 60_000,
    },
  ],
});

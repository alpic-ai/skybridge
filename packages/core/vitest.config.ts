import { defineConfig } from "vitest/config";

// Noise from @modelcontextprotocol/ext-apps PostMessageTransport & Protocol
// that leaks into test output during setup/teardown.
const MCP_APP_NOISE = [
  "Sending message",
  "Parsed message",
  "Ignoring message from unknown source",
];

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    exclude: ["**/node_modules/**", "**/dist/**"],
    onConsoleLog: (log) => {
      return !MCP_APP_NOISE.some((prefix) => log.includes(prefix));
    },
  },
});

import { AppsSdkAdapter } from "./apps-sdk-adapter.js";
import { McpAppAdapter } from "./mcp-app-adapter.js";
import type { Adapter } from "./types.js";

export const getAdapter = (): Adapter => {
  return window.skybridge.hostType === "apps-sdk"
    ? AppsSdkAdapter.getInstance()
    : McpAppAdapter.getInstance();
};

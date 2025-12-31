import * as AppsSdkAdapter from "./apps-sdk-adapter.js";
import * as McpAppAdapter from "./mcp-app-adapter.js";
import type { Methods } from "./types.js";

export const getBridgeMethods = (): Methods => {
  return window.skybridge.hostType === "apps-sdk"
    ? AppsSdkAdapter
    : McpAppAdapter;
};

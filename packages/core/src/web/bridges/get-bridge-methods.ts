import * as AppsSdkAdapter from "./apps-sdk-adapter";
import * as McpAppAdapter from "./mcp-app-adapter";
import type { Methods } from "./types";

export const getBridgeMethods = (): Methods => {
  return window.skybridge.hostType === "apps-sdk"
    ? AppsSdkAdapter
    : McpAppAdapter;
};

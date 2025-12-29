import * as AppsSdkAdapter from "./apps-sdk-adapter";
import * as McpAppAdapter from "./mcp-app-adapter";
import type { IBridgeMethods } from "./types";

export const getBridgeMethods = (): IBridgeMethods => {
  return window.skybridge.hostType === "apps-sdk"
    ? AppsSdkAdapter
    : McpAppAdapter;
};

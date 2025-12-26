import { AppsSdkBridge } from "./apps-sdk-bridge";
import { McpAppBridge } from "./mcp-app-bridge";
import type { IBridge } from "./types";

export const getBridgeMethods = (): IBridge => {
  const bridge =
    window.skybridge.hostType === "apps-sdk"
      ? AppsSdkBridge.getInstance()
      : McpAppBridge.getInstance();
  return {
    requestDisplayMode: bridge.requestDisplayMode,
  };
};

import { AppsSdkAdapter } from "./apps-sdk-adapter.js";
import { McpAppAdapter } from "./mcp-app-adapter.js";
import type { Methods } from "./types.js";

export const getBridgeMethod = <K extends keyof Methods>(
  key: K,
): Methods[K] => {
  const adapter =
    window.skybridge.hostType === "apps-sdk"
      ? AppsSdkAdapter.getInstance()
      : McpAppAdapter.getInstance();

  return adapter.getMethod(key);
};

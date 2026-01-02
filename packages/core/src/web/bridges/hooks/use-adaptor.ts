import { AppsSdkAdaptor } from "../adaptors/apps-sdk-adaptor.js";
import { McpAppAdaptor } from "../adaptors/mcp-app-adaptor.js";
import type { Adaptor } from "../types.js";

export const useAdaptor = (): Adaptor => {
  return window.skybridge.hostType === "apps-sdk"
    ? AppsSdkAdaptor.getInstance()
    : McpAppAdaptor.getInstance();
};

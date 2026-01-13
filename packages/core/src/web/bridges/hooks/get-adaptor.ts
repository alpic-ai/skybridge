import { AppsSdkAdaptor } from "../apps-sdk/adaptor.js";
import { McpAppAdaptor } from "../mcp-app/adaptor.js";
import type { Adaptor } from "../types.js";

export const getAdaptor = (): Adaptor => {
  return window.skybridge.hostType === "apps-sdk"
    ? AppsSdkAdaptor.getInstance()
    : McpAppAdaptor.getInstance();
};

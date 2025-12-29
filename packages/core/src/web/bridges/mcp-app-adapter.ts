import type {
  McpUiRequestDisplayModeRequest,
  McpUiRequestDisplayModeResult,
} from "@modelcontextprotocol/ext-apps";
import { McpAppBridge } from "./mcp-app-bridge";
import type { IBridgeMethods } from "./types";

export const requestDisplayMode: IBridgeMethods["requestDisplayMode"] = ({
  mode,
}) => {
  const bridge = McpAppBridge.getInstance();
  if (mode !== "modal") {
    return bridge.request<
      McpUiRequestDisplayModeRequest,
      McpUiRequestDisplayModeResult
    >({
      method: "ui/request-display-mode",
      params: { mode },
    });
  }

  throw new Error("Modal display mode is not accessible in MCP App.");
};

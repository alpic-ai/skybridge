import type {
  McpUiHostContext,
  McpUiRequestDisplayModeRequest,
  McpUiRequestDisplayModeResult,
} from "@modelcontextprotocol/ext-apps";
import type { BridgeExternalStore } from "./hooks/types.js";
import { McpAppBridge } from "./mcp-app-bridge.js";
import type { BridgeInterface, Methods } from "./types.js";

export const requestDisplayMode: Methods["requestDisplayMode"] = ({ mode }) => {
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

type BridgeInterfaceGetter = {
  [K in keyof BridgeInterface]: () => BridgeInterface[K];
};

const getMcpAppSnapshot = <K extends keyof BridgeInterface>(
  key: K,
): BridgeInterface[K] => {
  const bridge = McpAppBridge.getInstance();
  const getter: BridgeInterfaceGetter = {
    theme: () => bridge.getSnapshot("theme") ?? "light",
    locale: () => bridge.getSnapshot("locale") ?? "en-US",
    safeArea: () => {
      const insets = bridge.getSnapshot("safeAreaInsets");
      return {
        insets: insets ?? {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        },
      };
    },
    displayMode: () => bridge.getSnapshot("displayMode") ?? "inline",
    maxHeight: () =>
      bridge.getSnapshot("viewport")?.maxHeight ?? window.innerHeight,
    userAgent: () => {
      const capabilities = {
        ...{ hover: true, touch: true },
        ...(bridge.getSnapshot("deviceCapabilities") ?? {}),
      };

      const mcpAppPlatform = bridge.getSnapshot("platform");
      const deviceType = mcpAppPlatform
        ? mcpAppPlatform === "web"
          ? "desktop"
          : mcpAppPlatform
        : "unknown";

      return {
        device: {
          type: deviceType,
        },
        capabilities,
      };
    },
  };

  return getter[key]();
};

const BRIDGE_MCP_APP_SUBSCRIBE_DEPENDENCY: Record<
  keyof BridgeInterface,
  (keyof McpUiHostContext)[]
> = {
  theme: ["theme"],
  locale: ["locale"],
  safeArea: ["safeAreaInsets"],
  displayMode: ["displayMode"],
  maxHeight: ["viewport"],
  userAgent: ["platform", "deviceCapabilities"],
};

const getMcpAppSubscribe = <K extends keyof BridgeInterface>(
  key: K,
): BridgeExternalStore<K>["subscribe"] => {
  const bridge = McpAppBridge.getInstance();

  return bridge.subscribe(BRIDGE_MCP_APP_SUBSCRIBE_DEPENDENCY[key]);
};

export const getMcpAppExternalStore = <K extends keyof BridgeInterface>(
  key: K,
): BridgeExternalStore<K> => ({
  subscribe: getMcpAppSubscribe(key),
  getSnapshot: () => getMcpAppSnapshot(key),
});

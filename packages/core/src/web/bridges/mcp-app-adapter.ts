import type {
  McpUiHostContext,
  McpUiRequestDisplayModeRequest,
  McpUiRequestDisplayModeResult,
} from "@modelcontextprotocol/ext-apps";
import type { BridgeExternalStore, BridgeSubscribe } from "./hooks/types.js";
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

type PickContext<K extends readonly (keyof McpUiHostContext)[]> = {
  [P in K[number]]: McpUiHostContext[P];
};

const createExternalStore = <
  const Keys extends readonly (keyof McpUiHostContext)[],
  R,
>(
  keys: Keys,
  getSnapshot: (context: PickContext<Keys>) => R,
): {
  subscribe: BridgeSubscribe;
  getSnapshot: () => R;
} => {
  const bridge = McpAppBridge.getInstance();

  return {
    subscribe: bridge.subscribe(keys),
    getSnapshot: () => {
      const context = Object.fromEntries(
        keys.map((k) => [k, bridge.getSnapshot(k)]),
      ) as PickContext<Keys>;
      return getSnapshot(context);
    },
  };
};

export const getMcpAppExternalStore = <K extends keyof BridgeInterface>(
  key: K,
): BridgeExternalStore<K> => {
  const adapters: {
    [P in keyof BridgeInterface]: () => BridgeExternalStore<P>;
  } = {
    theme: () =>
      createExternalStore(["theme"], ({ theme }) => theme ?? "light"),

    locale: () =>
      createExternalStore(["locale"], ({ locale }) => locale ?? "en-US"),

    safeArea: () =>
      createExternalStore(["safeAreaInsets"], ({ safeAreaInsets }) => ({
        insets: safeAreaInsets ?? { top: 0, right: 0, bottom: 0, left: 0 },
      })),

    displayMode: () =>
      createExternalStore(
        ["displayMode"],
        ({ displayMode }) => displayMode ?? "inline",
      ),

    maxHeight: () =>
      createExternalStore(
        ["viewport"],
        ({ viewport }) => viewport?.maxHeight ?? window.innerHeight,
      ),

    userAgent: () =>
      createExternalStore(
        ["platform", "deviceCapabilities"],
        ({ platform, deviceCapabilities }) => ({
          device: {
            type: platform
              ? platform === "web"
                ? "desktop"
                : platform
              : "unknown",
          },
          capabilities: {
            hover: true,
            touch: true,
            ...deviceCapabilities,
          },
        }),
      ),
  };

  return adapters[key]();
};

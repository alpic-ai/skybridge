import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import { useSyncExternalStore } from "react";
import { AppsSdkBridge } from "../apps-sdk-bridge";
import { McpAppBridge } from "../mcp-app-bridge";

export type BridgeInterface = Required<
  Pick<McpUiHostContext, "theme" | "locale" | "displayMode">
> & {
  safeArea: {
    insets: NonNullable<McpUiHostContext["safeAreaInsets"]>;
  };
};

type BridgeExternalStore<K extends keyof BridgeInterface> = {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => BridgeInterface[K];
};

const DEFAULT_VALUE_FOR_MCP_APP_BRIDGE: BridgeInterface = {
  theme: "light",
  locale: "en-US",
  displayMode: "inline",
  safeArea: {
    insets: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  },
};

const getExternalStore = <K extends keyof BridgeInterface>(
  key: K,
  defaultValue: BridgeInterface[K] = DEFAULT_VALUE_FOR_MCP_APP_BRIDGE[key],
): BridgeExternalStore<K> => {
  const hostType = window.skybridge.hostType;
  if (hostType === "apps-sdk") {
    const bridge = AppsSdkBridge.getInstance();
    return {
      subscribe: bridge.subscribe(key),
      getSnapshot: () => bridge.getSnapshot(key),
    };
  }
  const bridge = McpAppBridge.getInstance();
  return {
    subscribe: bridge.subscribe(key),
    getSnapshot: () => {
      if (key === "safeArea") {
        const safeArea = bridge.getSnapshot("safeAreaInsets");
        return safeArea
          ? ({ insets: safeArea } as BridgeInterface[K])
          : defaultValue;
      }
      return (bridge.getSnapshot(key) ?? defaultValue) as BridgeInterface[K];
    },
  };
};

export const useBridge = <K extends keyof BridgeInterface>(
  key: K,
  defaultValue: BridgeInterface[K] = DEFAULT_VALUE_FOR_MCP_APP_BRIDGE[key],
): BridgeInterface[K] => {
  const externalStore = getExternalStore(key, defaultValue);

  return useSyncExternalStore(
    externalStore.subscribe,
    externalStore.getSnapshot,
  );
};

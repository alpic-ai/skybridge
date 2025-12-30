import { useSyncExternalStore } from "react";
import { AppsSdkBridge } from "../apps-sdk-bridge";
import { McpAppBridge } from "../mcp-app-bridge";
import type { BridgeInterface } from "../types";

type BridgeExternalStore<K extends keyof BridgeInterface> = {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => BridgeInterface[K];
};

const getDefaultValueFromMcpAppBridge = <K extends keyof BridgeInterface>(key: K): BridgeInterface[K] => {
  const DEFAULT_VALUES_FOR_MCP_APP_BRIDGE: BridgeInterface = {
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
    maxHeight: window.innerHeight
  }
  
  return DEFAULT_VALUES_FOR_MCP_APP_BRIDGE[key]
}

const getExternalStore = <K extends keyof BridgeInterface>(
  key: K,
): BridgeExternalStore<K> => {
  const defaultValue = getDefaultValueFromMcpAppBridge(key);
  const hostType = window.skybridge.hostType;
  if (hostType === "apps-sdk") {
    const bridge = AppsSdkBridge.getInstance();
    return {
      subscribe: bridge.subscribe(key),
      getSnapshot: () => bridge.getSnapshot(key),
    };
  }
  const bridge = McpAppBridge.getInstance();
  if (key === "safeArea") {
    return {
      subscribe: bridge.subscribe("safeAreaInsets"),
      getSnapshot: () => {
        const safeArea = bridge.getSnapshot("safeAreaInsets");
        return safeArea
          ? ({ insets: safeArea } as BridgeInterface[K])
          : defaultValue;
      },
    };
  }
  if (key === "maxHeight") {
    return {
      subscribe: bridge.subscribe("viewport"),
      getSnapshot: () => {
        const viewport = bridge.getSnapshot("viewport");
        return (viewport?.maxHeight ?? defaultValue) as BridgeInterface[K];
      },
    };
  }
  return {
    subscribe: bridge.subscribe(key),
    getSnapshot: () =>
      (bridge.getSnapshot(key) ?? defaultValue) as BridgeInterface[K],
  };
};

export const useBridge = <K extends keyof BridgeInterface>(
  key: K,
): BridgeInterface[K] => {
  const externalStore = getExternalStore(key);

  return useSyncExternalStore(
    externalStore.subscribe,
    externalStore.getSnapshot,
  );
};

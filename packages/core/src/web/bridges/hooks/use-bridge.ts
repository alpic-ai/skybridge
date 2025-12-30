import { useSyncExternalStore } from "react";
import { AppsSdkBridge } from "../apps-sdk-bridge.js";
import { getMcpAppSnapshot } from "../mcp-app-adapter.js";
import { McpAppBridge } from "../mcp-app-bridge.js";
import type { BridgeInterface } from "../types.js";

type BridgeExternalStore<K extends keyof BridgeInterface> = {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => BridgeInterface[K];
};

const getExternalStore = <K extends keyof BridgeInterface>(
  key: K,
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
    getSnapshot: () => getMcpAppSnapshot(key),
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

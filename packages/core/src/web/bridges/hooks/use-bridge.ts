import { useSyncExternalStore } from "react";
import { AppsSdkBridge } from "../apps-sdk-bridge.js";
import { getMcpAppAdapter } from "../mcp-app-adapter.js";
import type { BridgeInterface } from "../types.js";
import type { BridgeExternalStore } from "./types.js";

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

  return getMcpAppAdapter()[key];
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

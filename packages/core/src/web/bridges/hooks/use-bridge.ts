import { useSyncExternalStore } from "react";
import { AppsSdkAdapter } from "../apps-sdk-adapter.js";
import { McpAppAdapter } from "../mcp-app-adapter.js";
import type { BridgeInterface, ExternalStore } from "../types.js";

const getExternalStore = <K extends keyof BridgeInterface>(
  key: K,
): ExternalStore<K> => {
  const hostType = window.skybridge.hostType;
  if (hostType === "apps-sdk") {
    return AppsSdkAdapter.getInstance().getExternalStore(key);
  }

  return McpAppAdapter.getInstance().getExternalStore(key);
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

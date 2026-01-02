import { useSyncExternalStore } from "react";
import { AppsSdkAdaptor } from "../adaptors/apps-sdk-adaptor.js";
import { McpAppAdaptor } from "../adaptors/mcp-app-adaptor.js";
import type { BridgeInterface, ExternalStore } from "../types.js";

const getExternalStore = <K extends keyof BridgeInterface>(
  key: K,
): ExternalStore<K> => {
  const hostType = window.skybridge.hostType;
  if (hostType === "apps-sdk") {
    return AppsSdkAdaptor.getInstance().getExternalStore(key);
  }

  return McpAppAdaptor.getInstance().getExternalStore(key);
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

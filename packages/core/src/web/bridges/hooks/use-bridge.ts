import { useSyncExternalStore } from "react";
import type { BridgeInterface } from "../types.js";
import { getAdaptor } from "./get-adaptor.js";

export const useBridge = <K extends keyof BridgeInterface>(
  key: K,
): BridgeInterface[K] => {
  const adaptor = getAdaptor();
  const externalStore = adaptor.getExternalStore(key);

  return useSyncExternalStore(
    externalStore.subscribe,
    externalStore.getSnapshot,
  );
};

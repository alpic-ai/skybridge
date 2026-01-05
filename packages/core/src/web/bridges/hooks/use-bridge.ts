import { useSyncExternalStore } from "react";
import type { BridgeInterface } from "../types.js";
import { useAdaptor } from "./use-adaptor.js";

export const useBridge = <K extends keyof BridgeInterface>(
  key: K,
): BridgeInterface[K] => {
  const adaptor = useAdaptor();
  const externalStore = adaptor.getExternalStore(key);

  return useSyncExternalStore(
    externalStore.subscribe,
    externalStore.getSnapshot,
  );
};

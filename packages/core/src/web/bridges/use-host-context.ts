import { useSyncExternalStore } from "react";
import { getAdaptor } from "./get-adaptor.js";
import type { HostContext } from "./types.js";

export const useHostContext = <K extends keyof HostContext>(
  key: K,
): HostContext[K] => {
  const adaptor = getAdaptor();
  const store = adaptor.getHostContextStore(key);

  return useSyncExternalStore(store.subscribe, store.getSnapshot);
};

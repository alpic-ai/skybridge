import { useSyncExternalStore } from "react";
import { getAdaptor } from "./get-adaptor.js";
import type { HostContext } from "./types.js";

/**
 * @internal
 * Subscribe to a single {@link HostContext} key via `useSyncExternalStore`.
 * Used to build the higher-level hooks; prefer those for app code.
 */
export const useHostContext = <K extends keyof HostContext>(
  key: K,
): HostContext[K] => {
  const adaptor = getAdaptor();
  const store = adaptor.getHostContextStore(key);

  return useSyncExternalStore(store.subscribe, store.getSnapshot);
};

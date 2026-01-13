import { useSyncExternalStore } from "react";
import { AppsSdkBridge } from "./bridge.js";
import type { AppsSdkContext } from "./types.js";

export function useAppsSdkContext<K extends keyof AppsSdkContext>(
  key: K,
): AppsSdkContext[K] {
  const bridge = AppsSdkBridge.getInstance();
  return useSyncExternalStore(bridge.subscribe(key), () =>
    bridge.getSnapshot(key),
  );
}

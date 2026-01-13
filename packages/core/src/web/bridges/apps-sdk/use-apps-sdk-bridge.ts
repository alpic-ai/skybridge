import { useSyncExternalStore } from "react";
import { AppsSdkBridge } from "./bridge.js";
import type { AppsSdkProperties } from "./types.js";

export function useAppsSdkBridge<K extends keyof AppsSdkProperties>(
  key: K,
): AppsSdkProperties[K] {
  const bridge = AppsSdkBridge.getInstance();
  return useSyncExternalStore(bridge.subscribe(key), () =>
    bridge.getSnapshot(key),
  );
}

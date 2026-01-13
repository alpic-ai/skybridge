import { useSyncExternalStore } from "react";
import { AppsSdkBridge } from "./bridge.js";
import type { OpenAiProperties } from "./types.js";

export function useAppsSdkBridge<K extends keyof OpenAiProperties>(
  key: K,
): OpenAiProperties[K] {
  const bridge = AppsSdkBridge.getInstance();
  return useSyncExternalStore(bridge.subscribe(key), () =>
    bridge.getSnapshot(key),
  );
}

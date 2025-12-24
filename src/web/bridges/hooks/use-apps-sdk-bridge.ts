import { useSyncExternalStore } from "react";
import type { OpenAiProperties } from "../../types.js";
import { AppsSdkBridge } from "../apps-sdk-bridge.js";

export function useAppsSdkBridge<K extends keyof OpenAiProperties>(
  key: K,
): OpenAiProperties[K] {
  const bridge = AppsSdkBridge.getInstance();
  return useSyncExternalStore(bridge.subscribe(key), () =>
    bridge.getSnapshot(key),
  );
}

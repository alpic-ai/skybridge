import { useAppsSdkBridge } from "../bridges/use-apps-sdk-bridge.js";
import type { OpenAiProperties } from "../types.js";

/** @deprecated Use `useAppsSdkBridge` instead */
export function useOpenAiGlobal<K extends keyof OpenAiProperties>(
  key: K,
): OpenAiProperties[K] {
  return useAppsSdkBridge(key);
}

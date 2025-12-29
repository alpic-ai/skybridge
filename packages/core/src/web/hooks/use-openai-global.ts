import { useAppsSdkBridge } from "../bridges/index.js";
import type { OpenAiProperties } from "../types.js";

/** @deprecated Use `useAppsSdkBridge` instead */
export function useOpenAiGlobal<K extends keyof OpenAiProperties>(
  key: K,
): OpenAiProperties[K] {
  return useAppsSdkBridge(key);
}

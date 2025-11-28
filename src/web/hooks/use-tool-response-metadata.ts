import { useOpenAiGlobal } from "./use-openai-global.js";

/**
 * @deprecated This hook is deprecated. Use `useToolInfo()` instead and access the `responseMetadata` property.
 */
export function useToolResponseMetadata() {
  return useOpenAiGlobal("toolResponseMetadata");
}

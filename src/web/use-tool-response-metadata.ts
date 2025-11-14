import { useOpenAiGlobal } from "./use-openai-global.js";

export function useToolResponseMetadata() {
  return useOpenAiGlobal("toolResponseMetadata");
}

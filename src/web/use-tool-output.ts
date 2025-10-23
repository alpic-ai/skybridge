import { useOpenAiGlobal } from "./use-openai-global.js";

export function useToolOutput() {
  return useOpenAiGlobal("toolOutput");
}

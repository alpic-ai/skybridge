import { useOpenAiGlobal } from "./use-openai-global";

export function useToolOutput() {
  return useOpenAiGlobal("toolOutput");
}

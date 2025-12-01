import { useOpenAiGlobal } from "./use-openai-global.js";

export function useToolInfo() {
  return {
    output: useOpenAiGlobal("toolOutput"),
    input: useOpenAiGlobal("toolInput"),
    responseMetadata: useOpenAiGlobal("toolResponseMetadata"),
  };
}

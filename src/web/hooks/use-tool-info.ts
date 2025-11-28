import { useOpenAiGlobal } from "skybridge/web";

export function useToolInfo() {
  return {
    output: useOpenAiGlobal("toolOutput"),
    input: useOpenAiGlobal("toolInput"),
    responseMetadata: useOpenAiGlobal("toolResponseMetadata"),
  };
}

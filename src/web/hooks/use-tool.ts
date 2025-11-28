import { useOpenAiGlobal } from "skybridge/web";

export function useTool() {
  return { output: useOpenAiGlobal("toolOutput"), input: useOpenAiGlobal("toolInput") };
}

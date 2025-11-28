import { useOpenAiGlobal } from "./use-openai-global.js";

export function useLocale() {
  return useOpenAiGlobal("locale")!;
}

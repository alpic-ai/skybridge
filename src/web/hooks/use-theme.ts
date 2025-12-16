import { useOpenAiGlobal } from "./use-openai-global.js";

export function useTheme() {
  return useOpenAiGlobal("theme");
}

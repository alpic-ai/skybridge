import { useOpenAiGlobal } from "./use-openai-global.js";

export function useUserAgent() {
  return useOpenAiGlobal("userAgent")!;
}

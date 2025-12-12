import { useOpenAiGlobal } from "./use-openai-global.js";

export function useUserAgent() {
  const userAgent = useOpenAiGlobal("userAgent");
  if (userAgent === undefined) {
    throw new Error(
      "userAgent is not available. Make sure you're calling this hook within the OpenAI iFrame skybridge runtime.",
    );
  }
  return userAgent;
}

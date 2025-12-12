import { useOpenAiGlobal } from "./use-openai-global.js";

export function useLocale() {
  const locale = useOpenAiGlobal("locale");
  if (locale === undefined) {
    throw new Error(
      "locale is not available. Make sure you're calling this hook within the OpenAI iFrame skybridge runtime.",
    );
  }
  return locale;
}

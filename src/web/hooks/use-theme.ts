import { useOpenAiGlobal } from "./use-openai-global.js";

export function useTheme() {
  const theme = useOpenAiGlobal("theme");
  if (theme === undefined) {
    throw new Error(
      "theme is not available. Make sure you're calling this hook within the OpenAI iFrame skybridge runtime.",
    );
  }
  return theme;
}

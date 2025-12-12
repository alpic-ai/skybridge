import type { DisplayMode } from "../types.js";
import { useOpenAiGlobal } from "./use-openai-global.js";

export function useDisplayMode() {
  const displayMode = useOpenAiGlobal("displayMode");
  if (displayMode === undefined) {
    throw new Error(
      "displayMode is not available. Make sure you're calling this hook within the OpenAI iFrame skybridge runtime.",
    );
  }
  const setDisplayMode = (mode: DisplayMode) =>
    window.openai.requestDisplayMode({ mode });

  return [displayMode, setDisplayMode] as const;
}

import { useOpenAiGlobal } from "./use-openai-global.js";
import type { DisplayMode } from "../types.js";

export function useDisplayMode() {
  const displayMode = useOpenAiGlobal("displayMode")!;
  const setDisplayMode = (mode: DisplayMode) =>
    window.openai.requestDisplayMode({ mode });

  return [displayMode, setDisplayMode] as const;
}

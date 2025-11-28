import { useOpenAiGlobal } from "./use-openai-global.js";

export function useDisplayMode() {
  const displayMode = useOpenAiGlobal("displayMode")!;
  const setDisplayMode = window.openai.requestDisplayMode;

  return [displayMode, setDisplayMode] as const;
}

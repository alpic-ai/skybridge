import { useOpenAiGlobal } from "skybridge/web";

export function useDisplayMode() {
  const displayMode = useOpenAiGlobal("displayMode");
  const setDisplayMode = useOpenAiGlobal("requestDisplayMode");

  return { displayMode, setDisplayMode };
}

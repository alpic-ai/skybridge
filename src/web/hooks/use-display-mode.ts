import { useAppsSdkBridge } from "../bridges/use-apps-sdk-bridge.js";
import type { DisplayMode } from "../types.js";

export function useDisplayMode() {
  const displayMode = useAppsSdkBridge("displayMode");
  const setDisplayMode = (mode: DisplayMode) =>
    window.openai.requestDisplayMode({ mode });

  return [displayMode, setDisplayMode] as const;
}

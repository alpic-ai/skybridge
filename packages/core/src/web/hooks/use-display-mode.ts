import { useCallback } from "react";
import { getBridge } from "../bridges/get-bridge.js";
import { useBridge } from "../bridges/index.js";
import type { DisplayMode } from "../types.js";

export function useDisplayMode() {
  const displayMode = useBridge("displayMode");
  const bridge = getBridge();
  const setDisplayMode = useCallback(
    (mode: DisplayMode) => bridge.requestDisplayMode({ mode }),
    [bridge],
  );

  return [displayMode, setDisplayMode] as const;
}

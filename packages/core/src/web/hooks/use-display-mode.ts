import { useCallback } from "react";
import { getBridgeMethod } from "../bridges/get-bridge-method.js";
import { useBridge } from "../bridges/index.js";
import type { DisplayMode } from "../types.js";

export function useDisplayMode() {
  const displayMode = useBridge("displayMode");
  const requestDisplayMode = getBridgeMethod("requestDisplayMode");
  const setDisplayMode = useCallback(
    (mode: DisplayMode) => requestDisplayMode({ mode }),
    [requestDisplayMode],
  );

  return [displayMode, setDisplayMode] as const;
}

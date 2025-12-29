import { useCallback } from "react";
import { getBridgeMethods } from "../bridges/get-bridge-methods.js";
import { useBridge } from "../bridges/index.js";
import type { DisplayMode } from "../types.js";

export function useDisplayMode() {
  const displayMode = useBridge("displayMode");
  const { requestDisplayMode } = getBridgeMethods();
  const setDisplayMode = useCallback(
    (mode: DisplayMode) => requestDisplayMode({ mode }),
    [requestDisplayMode],
  );

  return [displayMode, setDisplayMode] as const;
}

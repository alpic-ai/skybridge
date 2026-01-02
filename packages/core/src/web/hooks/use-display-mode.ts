import { useCallback } from "react";
import { getAdapter } from "../bridges/get-adapter.js";
import { useBridge } from "../bridges/index.js";
import type { DisplayMode } from "../bridges/types.js";

export function useDisplayMode() {
  const displayMode = useBridge("displayMode");
  const adapter = getAdapter();
  const setDisplayMode = useCallback(
    (mode: DisplayMode) => adapter.requestDisplayMode(mode),
    [adapter],
  );

  return [displayMode, setDisplayMode] as const;
}

import { useCallback } from "react";
import { getAdaptor } from "../bridges/hooks/get-adaptor.js";
import { useBridge } from "../bridges/index.js";
import type { DisplayMode } from "../bridges/types.js";

export function useDisplayMode() {
  const displayMode = useBridge("displayMode");
  const adaptor = getAdaptor();
  const setDisplayMode = useCallback(
    (mode: DisplayMode) => adaptor.requestDisplayMode(mode),
    [adaptor],
  );

  return [displayMode, setDisplayMode] as const;
}

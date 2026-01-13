import { useCallback } from "react";
import { getAdaptor, useBridge } from "../bridges";
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

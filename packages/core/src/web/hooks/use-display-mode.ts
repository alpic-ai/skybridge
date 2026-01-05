import { useCallback } from "react";
import { useAdaptor } from "../bridges/hooks/use-adaptor.js";
import { useBridge } from "../bridges/index.js";
import type { DisplayMode } from "../bridges/types.js";

export function useDisplayMode() {
  const displayMode = useBridge("displayMode");
  const adaptor = useAdaptor();
  const setDisplayMode = useCallback(
    (mode: DisplayMode) => adaptor.requestDisplayMode(mode),
    [adaptor],
  );

  return [displayMode, setDisplayMode] as const;
}

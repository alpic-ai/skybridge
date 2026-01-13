import { useCallback } from "react";
import { getAdaptor, useHostContext } from "../bridges/index.js";
import type { DisplayMode } from "../bridges/types.js";

export function useDisplayMode() {
  const displayMode = useHostContext("displayMode");
  const adaptor = getAdaptor();
  const setDisplayMode = useCallback(
    (mode: DisplayMode) => adaptor.requestDisplayMode(mode),
    [adaptor],
  );

  return [displayMode, setDisplayMode] as const;
}

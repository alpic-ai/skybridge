import { useCallback } from "react";
import { getAdaptor, useHostContext } from "../bridges/index.js";
import type { RequestDisplayMode } from "../bridges/types.js";

/**
 * Read and change the view's display mode (`"inline"`, `"pip"`, `"fullscreen"`).
 *
 * Returns a tuple `[displayMode, setDisplayMode]`. `setDisplayMode` asks the
 * host to switch modes — the host returns the mode it actually applied, which
 * may differ from the request. The reported value also updates when the host
 * changes the mode on its own (e.g. user expands the widget).
 *
 * `"modal"` is reachable via {@link useRequestModal}, not this hook. To react
 * to layout changes that come with display-mode switches (e.g. `maxHeight`),
 * pair with {@link useLayout}.
 *
 * @example
 * ```tsx
 * const [mode, setMode] = useDisplayMode();
 * <button onClick={() => setMode("fullscreen")}>Expand</button>
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/use-display-mode
 */
export function useDisplayMode() {
  const displayMode = useHostContext("displayMode");
  const adaptor = getAdaptor();
  const setDisplayMode = useCallback(
    (mode: RequestDisplayMode) => adaptor.requestDisplayMode(mode),
    [adaptor],
  );

  return [displayMode, setDisplayMode] as const;
}

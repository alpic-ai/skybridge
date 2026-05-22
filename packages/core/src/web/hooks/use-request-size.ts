import { useCallback } from "react";
import { getAdaptor } from "../bridges/index.js";
import type { RequestSizeOptions } from "../bridges/types.js";

/** Function that asks the host to resize the view, returned by {@link useRequestSize}. */
export type RequestSizeFn = (size: RequestSizeOptions) => Promise<void>;

/**
 * Ask the host to resize the view iframe. The applied size is host-driven —
 * the host decides whether and how to honor the request, and {@link useLayout}
 * still reports the final `maxHeight` it allows.
 *
 * Pair with a `ResizeObserver` on your root element to react to content size
 * changes without hard-coded values.
 *
 * @example
 * ```tsx
 * const requestSize = useRequestSize();
 * useEffect(() => { requestSize({ height: rootRef.current!.scrollHeight }); }, [content]);
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/use-request-size
 */
export function useRequestSize(): RequestSizeFn {
  const adaptor = getAdaptor();
  const requestSize = useCallback(
    (size: RequestSizeOptions) => adaptor.requestSize(size),
    [adaptor],
  );

  return requestSize;
}

import { useCallback } from "react";
import { getAdaptor } from "../bridges/index.js";

/** Function that asks the host to close the current view, returned by {@link useRequestClose}. */
export type RequestCloseFn = () => Promise<void>;

/**
 * Ask the host to close (dismiss) the current view. The host decides whether
 * to honor the request. Useful from modal views or after a terminal action
 * like "Done".
 *
 * @example
 * ```tsx
 * const close = useRequestClose();
 * <button onClick={() => close()}>Done</button>
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/use-request-close
 */
export function useRequestClose(): RequestCloseFn {
  const adaptor = getAdaptor();
  const requestClose = useCallback(() => adaptor.requestClose(), [adaptor]);

  return requestClose;
}

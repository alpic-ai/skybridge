import { useCallback } from "react";
import { getAdaptor } from "../bridges/index.js";

/**
 * Returns a function to request the host to close the current widget.
 * This allows widgets to ask the host to close them programmatically.
 */
export function useRequestClose() {
  const adaptor = getAdaptor();
  const requestClose = useCallback(() => adaptor.requestClose(), [adaptor]);

  return requestClose;
}

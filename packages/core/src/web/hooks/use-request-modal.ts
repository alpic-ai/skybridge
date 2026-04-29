import { useCallback } from "react";
import {
  getAdaptor,
  type RequestModalOptions,
  useHostContext,
} from "../bridges/index.js";

/**
 * Triggers a modal containing the view rendered in display mode "modal"
 */
export function useRequestModal() {
  const adaptor = getAdaptor();
  const display = useHostContext("display");
  const open = useCallback(
    (opts: RequestModalOptions) => adaptor.openModal(opts),
    [adaptor],
  );
  return {
    isOpen: display.mode === "modal",
    params: display.params,
    open,
  };
}

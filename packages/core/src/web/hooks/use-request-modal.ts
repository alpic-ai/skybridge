import { useCallback } from "react";
import {
  getAdaptor,
  type RequestModalOptions,
  useHostContext,
} from "../bridges";

/**
 * Triggers a modal containing the widget rendered in display mode "modal"
 */
export function useRequestModal() {
  const adaptor = getAdaptor();
  const view = useHostContext("view");
  const open = useCallback(
    (opts: RequestModalOptions) => adaptor.openModal(opts),
    [adaptor],
  );
  return {
    isOpen: view.mode === "modal",
    params: view.params,
    open,
  };
}

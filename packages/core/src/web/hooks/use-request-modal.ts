import { useCallback } from "react";
import {
  getAdaptor,
  type RequestModalOptions,
  useHostContext,
} from "../bridges/index.js";

/**
 * Open the current view in a modal overlay (`displayMode === "modal"`).
 *
 * Returns `{ isOpen, params, open }`: `open(opts)` triggers the host to render
 * the view in a modal, optionally passing `params` that are surfaced back via
 * `params` here. Useful for confirmation flows, detail panels, or any modal
 * lifecycle owned by the host.
 *
 * Use {@link useDisplayMode} for non-modal display modes.
 *
 * @example
 * ```tsx
 * const { isOpen, open } = useRequestModal();
 * <button onClick={() => open({ params: { id: 42 } })}>Show details</button>
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/use-request-modal
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

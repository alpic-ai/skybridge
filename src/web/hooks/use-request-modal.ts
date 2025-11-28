import type { RequestModalOptions } from "../types.js";

/**
 * Triggers a modal containing the widget rendered in display mode "modal"
 */
export function useRequestModal() {
  return (options: RequestModalOptions) => {
    window.openai.requestModal(options);
  };
}

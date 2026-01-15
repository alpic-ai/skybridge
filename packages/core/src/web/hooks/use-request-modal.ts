import { getAdaptor } from "../bridges";

/**
 * Triggers a modal containing the widget rendered in display mode "modal"
 */
export function useRequestModal() {
  return getAdaptor().useRequestModal();
}

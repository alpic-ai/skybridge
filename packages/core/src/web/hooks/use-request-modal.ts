import type { RequestModalOptions } from "../types.js";
import { useOpenAiGlobal } from "./use-openai-global.js";

/**
 * Triggers a modal containing the widget rendered in display mode "modal"
 */
export function useRequestModal() {
  const view = useOpenAiGlobal("view");
  const isOpen = view?.mode === "modal";
  const params = view?.params;

  const open = (options: RequestModalOptions) => {
    window.openai.requestModal(options);
  };

  return { isOpen, open, params };
}

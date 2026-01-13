import {
  type RequestModalOptions,
  useAppsSdkContext,
} from "../bridges/apps-sdk/index.js";

/**
 * Triggers a modal containing the widget rendered in display mode "modal"
 */
export function useRequestModal() {
  const view = useAppsSdkContext("view");
  const isOpen = view?.mode === "modal";
  const params = view?.params;

  const open = (options: RequestModalOptions) => {
    window.openai.requestModal(options);
  };

  return { isOpen, open, params };
}

import {
  type RequestModalOptions,
  useAppsSdkBridge,
} from "../bridges/apps-sdk";

/**
 * Triggers a modal containing the widget rendered in display mode "modal"
 */
export function useRequestModal() {
  const view = useAppsSdkBridge("view");
  const isOpen = view?.mode === "modal";
  const params = view?.params;

  const open = (options: RequestModalOptions) => {
    window.openai.requestModal(options);
  };

  return { isOpen, open, params };
}

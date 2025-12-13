import { useOpenAiGlobal } from "./use-openai-global.js";

/**
 * Triggers a modal containing the widget rendered in display mode "modal"
 */
export function useRequestModal() {
  const displayMode = useOpenAiGlobal("displayMode");
  const isOpen = displayMode === "modal";

  const open = (options: {
    title?: string;
    params?: Record<string, unknown>;
    anchor?: { top?: number; left?: number; width?: number; height?: number };
  }) => {
    window.openai.requestModal(options);
  };

  return [open, isOpen] as const;
}

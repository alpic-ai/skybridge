import type { SafeArea, Theme } from "../types.js";
import { useOpenAiGlobal } from "./use-openai-global.js";

export type LayoutState = {
  theme: Theme;
  maxHeight: number;
  safeArea: SafeArea;
};

/**
 * Hook for accessing layout and visual environment information.
 * These values may change on resize or theme toggle.
 *
 * @example
 * ```tsx
 * const { theme, maxHeight, safeArea } = useLayout();
 *
 * // Apply theme-aware styling
 * const backgroundColor = theme === "dark" ? "#1a1a1a" : "#ffffff";
 *
 * // Respect safe area insets
 * const paddingTop = safeArea.insets.top;
 * ```
 */
export function useLayout(): LayoutState {
  const theme = useOpenAiGlobal("theme");
  const maxHeight = useOpenAiGlobal("maxHeight");
  const safeArea = useOpenAiGlobal("safeArea");

  return { theme, maxHeight, safeArea };
}

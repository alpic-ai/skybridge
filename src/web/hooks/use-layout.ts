import { useBridge } from "../bridges/index.js";
import type { SafeArea, Theme } from "../types.js";

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
  const theme = useBridge("theme");
  const maxHeight = useBridge("maxHeight");
  const safeArea = useBridge("safeArea");

  return { theme, maxHeight, safeArea };
}

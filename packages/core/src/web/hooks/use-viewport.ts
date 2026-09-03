import { type SafeArea, useHostContext } from "../bridges/index.js";

export type ViewportState = {
  maxHeight: number | undefined;
  safeArea: SafeArea;
};

/**
 * Hook for accessing the live viewport geometry the host grants the view.
 * These values change on resize, so consumers re-render with them by design.
 *
 * @example
 * ```tsx
 * const { maxHeight, safeArea } = useViewport();
 *
 * // Respect safe area insets
 * const paddingTop = safeArea.insets.top;
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/use-viewport
 */
export function useViewport(): ViewportState {
  const maxHeight = useHostContext("maxHeight");
  const safeArea = useHostContext("safeArea");

  return { maxHeight, safeArea };
}

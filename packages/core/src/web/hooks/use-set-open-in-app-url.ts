import { useCallback } from "react";
import { getAdaptor } from "../bridges/index.js";

/**
 * Override the target URL the host opens from its fullscreen "Open in <App>"
 * affordance. If unset, the host opens the view's current iframe path.
 *
 * Currently Apps-SDK-only — calling this from MCP Apps throws.
 *
 * Call this once your view has enough context to construct the canonical URL
 * (e.g. a permalink to the entity the user is currently viewing).
 *
 * @example
 * ```tsx
 * const setOpenInAppUrl = useSetOpenInAppUrl();
 * useEffect(() => { setOpenInAppUrl(`https://example.com/orders/${orderId}`); }, [orderId]);
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/use-set-open-in-app-url
 */
export function useSetOpenInAppUrl() {
  const adaptor = getAdaptor();
  const setOpenInAppUrl = useCallback(
    (href: string) => adaptor.setOpenInAppUrl(href),
    [adaptor],
  );

  return setOpenInAppUrl;
}

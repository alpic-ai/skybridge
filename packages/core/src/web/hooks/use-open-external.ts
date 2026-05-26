import { useCallback } from "react";
import { getAdaptor } from "../bridges/index.js";
import type { OpenExternalOptions } from "../bridges/types.js";

/** Function that opens a URL outside the view's iframe, returned by {@link useOpenExternal}. */
export type OpenExternalFn = (
  href: string,
  options?: OpenExternalOptions,
) => void;

/**
 * Open an external URL through the host (e.g. in the user's browser).
 *
 * Use this instead of `window.open` or anchor `target="_blank"`, which are
 * unreliable inside a sandboxed iframe. Hosts may transform the URL (e.g.
 * ChatGPT appends a `?redirectUrl=…` parameter for allowlisted targets — pass
 * `redirectUrl: false` to suppress it).
 *
 * @example
 * ```tsx
 * const openExternal = useOpenExternal();
 * <button onClick={() => openExternal("https://example.com")}>Open docs</button>
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/use-open-external
 */
export function useOpenExternal(): OpenExternalFn {
  const adaptor = getAdaptor();
  const openExternal = useCallback(
    (href: string, options?: OpenExternalOptions) =>
      adaptor.openExternal(href, options),
    [adaptor],
  );

  return openExternal;
}

import { useMcpAppContext } from "../bridges/index.js";

/**
 * App-relative URL (path and query, e.g. `"/parts?tag=bolt"`) that ChatGPT
 * opened the view on through a deep link. Updates when the user follows
 * another deep link while the view is open. `undefined` when the view was not
 * opened through a deep link, on hosts other than ChatGPT, or when the host
 * sends a URL that isn't app-relative (it must start with a single `/`) or
 * that contains a fragment.
 *
 * Deep links target global entrypoints: set `openai.entrypoints` to include
 * `"global"` on the tool.
 *
 * @example
 * ```tsx
 * const deepLink = useDeepLink();
 * useEffect(() => {
 *   if (deepLink) navigate(deepLink);
 * }, [deepLink, navigate]);
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/use-deep-link
 */
export function useDeepLink(): string | undefined {
  const url = useMcpAppContext("openai/deepLink")?.url;
  if (
    typeof url !== "string" ||
    !url.startsWith("/") ||
    url.startsWith("//") ||
    url.startsWith("/\\") ||
    url.includes("#")
  ) {
    return undefined;
  }
  return url;
}

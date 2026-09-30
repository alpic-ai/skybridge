import { useMcpAppContext } from "../bridges/index.js";

function toUrl(deepLink: unknown): unknown {
  if (typeof deepLink !== "object" || deepLink === null) {
    return undefined;
  }
  if ("url" in deepLink) {
    return deepLink.url;
  }
  if (
    "path" in deepLink &&
    Array.isArray(deepLink.path) &&
    deepLink.path.every((segment) => typeof segment === "string") &&
    "query" in deepLink &&
    Array.isArray(deepLink.query) &&
    deepLink.query.every(
      (pair) =>
        Array.isArray(pair) &&
        pair.length === 2 &&
        pair.every((part) => typeof part === "string"),
    )
  ) {
    try {
      const search = new URLSearchParams(deepLink.query).toString();
      const path = deepLink.path.map(encodeURIComponent).join("/");
      return `/${path}${search ? `?${search}` : ""}`;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

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
  const url = toUrl(useMcpAppContext("openai/deepLink"));
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

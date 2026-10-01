import * as z from "zod/v4";
import { useMcpAppContext } from "../bridges/index.js";

const DeepLinkSchema = z.union([
  z.object({ url: z.string() }),
  z.object({
    path: z.array(z.string()),
    query: z.array(z.tuple([z.string(), z.string()])),
  }),
]);

function toUrl(deepLink: unknown): string | undefined {
  const parsed = DeepLinkSchema.safeParse(deepLink);
  if (!parsed.success) {
    return undefined;
  }
  if ("url" in parsed.data) {
    return parsed.data.url;
  }
  const search = new URLSearchParams(parsed.data.query).toString();
  const path = parsed.data.path.map(encodeURIComponent).join("/");
  return `/${path}${search ? `?${search}` : ""}`;
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
 * `{ type: "global" }` on the tool.
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
    url === undefined ||
    !url.startsWith("/") ||
    url.startsWith("//") ||
    url.startsWith("/\\") ||
    url.includes("#")
  ) {
    return undefined;
  }
  return url;
}

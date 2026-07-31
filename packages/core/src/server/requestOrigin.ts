import { getDomain } from "tldts";

/**
 * Resolves this server's public origin from request headers, in precedence
 * `x-forwarded-host` → `host` → localhost dev fallback. Shared by view serving
 * and OAuth metadata so the two can't drift. `Origin` is deliberately ignored:
 * it carries the *caller's* site, not this server's.
 */
export function resolveServerOrigin(
  header: (key: string) => string | undefined,
): string {
  // Proxies may send X-Forwarded-* as a comma-separated chain; the client-facing
  // hop is the first entry.
  const firstHop = (value: string | undefined) => value?.split(",")[0]?.trim();
  const forwardedHost = firstHop(header("x-forwarded-host"));
  if (forwardedHost) {
    const proto = firstHop(header("x-forwarded-proto")) || "https";
    return `${proto}://${forwardedHost}`;
  }
  const host = header("host");
  if (host) {
    const proto = ["127.0.0.1:", "localhost:"].some((p) => host.startsWith(p))
      ? "http"
      : "https";
    return `${proto}://${host}`;
  }
  return `http://localhost:${process.env.__PORT || "3000"}`;
}

/** Resolve the registrable host used as the default widget security domain. */
export function resolveWidgetDomain(serverOrigin: string): string {
  const hostname = new URL(serverOrigin).hostname;
  return getDomain(hostname, { allowPrivateDomains: true }) ?? serverOrigin;
}

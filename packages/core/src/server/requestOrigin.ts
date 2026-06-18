/**
 * Resolves this server's public origin from request headers, in precedence
 * `x-forwarded-host` → `origin` → `host` → localhost dev fallback. Shared by
 * view serving and OAuth metadata so the two can't drift.
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
  // Skip opaque origins (browsers send the literal "null") and other
  // non-URL values, falling through to the Host header.
  const origin = header("origin");
  if (origin && URL.canParse(origin)) {
    return origin;
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

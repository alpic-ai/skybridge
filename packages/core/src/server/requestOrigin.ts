/**
 * Resolves this server's public origin from request headers, in precedence
 * `x-forwarded-host` → `origin` → `host` → localhost dev fallback. Shared by
 * view serving and OAuth metadata so the two can't drift.
 */
export function resolveServerOrigin(
  header: (key: string) => string | undefined,
): string {
  const forwardedHost = header("x-forwarded-host");
  if (forwardedHost) {
    const proto = header("x-forwarded-proto") || "https";
    return `${proto}://${forwardedHost}`;
  }
  const origin = header("origin");
  if (origin) {
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

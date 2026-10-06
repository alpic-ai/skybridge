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
    const proto =
      firstHop(header("x-forwarded-proto")) ||
      (isLoopbackHost(forwardedHost) ? "http" : "https");
    return `${proto}://${forwardedHost}`;
  }
  const host = header("host");
  if (host) {
    const proto = isLoopbackHost(host) ? "http" : "https";
    return `${proto}://${host}`;
  }
  return `http://localhost:${process.env.__PORT || "3000"}`;
}

/**
 * Loopback names that are served over HTTP in local development.
 * Includes bare `localhost` and any name ending in `.localhost` (RFC 6761 §6.3).
 */
function isLoopbackHost(host: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(`http://${host}`).hostname;
  } catch {
    return false;
  }
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "::1"
  );
}

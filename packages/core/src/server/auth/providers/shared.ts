/** Normalises a bare host to an https issuer URL and strips a trailing slash. */
export function toIssuerUrl(domain: string): string {
  const withScheme = /^https?:\/\//.test(domain) ? domain : `https://${domain}`;
  return withScheme.replace(/\/$/, "");
}

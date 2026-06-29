import type { OAuthConfig } from "../index.js";
import { type CustomProviderOptions, customProvider } from "./custom.js";
import { toIssuerUrl } from "./shared.js";

/**
 * OAuth provider for Clerk. `domain` is the Frontend API URL (e.g.
 * `acme.clerk.accounts.dev`, or a production custom domain). Requires Dynamic
 * Client Registration enabled on the instance, and the OAuth application set to
 * issue JWT access tokens (opaque tokens can't be JWKS-verified).
 *
 * Clerk access tokens carry no `aud` claim, so there is no `audience` option —
 * verification is issuer + JWKS only (matching Clerk's own `mcpAuthClerk`).
 */
export function clerkProvider(
  opts: { domain: string } & Omit<CustomProviderOptions, "issuer" | "audience">,
): Promise<OAuthConfig> {
  const { domain, ...rest } = opts;
  return customProvider({ issuer: toIssuerUrl(domain), ...rest });
}

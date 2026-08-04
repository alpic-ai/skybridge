import type { OAuthConfig } from "../index.js";
import type { RegisteredClaims } from "../verify.js";
import { type CustomProviderOptions, customProvider } from "./custom.js";
import { toIssuerUrl } from "./shared.js";

/**
 * Claims a Clerk session token (v2) carries. All optional: `o` and `act` appear
 * only with organizations and impersonation, and `email` only when a JWT
 * template adds it.
 *
 * @see https://clerk.com/docs/backend-requests/resources/session-tokens
 * @see https://clerk.com/docs/backend-requests/jwt-templates
 */
export type ClerkClaims = {
  /** The Clerk user id (the token's `sub`). */
  subject?: string;
  /** Session id. */
  sid?: string;
  /** Authorized party: the origin the token was issued to. */
  azp?: string;
  /** Session token version. */
  v?: number;
  /** Factor verification age, `[since-first-factor, since-second-factor]`. */
  fva?: number[];
  /** Active organization, when the user has one. */
  o?: {
    /** Organization id. */
    id?: string;
    /** Organization slug. */
    slg?: string;
    /** Role within the organization. */
    rol?: string;
    /** Permissions within the organization. */
    per?: string;
    /** Feature-permission map backing `per`. */
    fpm?: string;
  };
  /** Actor, present while a user is being impersonated. */
  act?: Record<string, unknown>;
  /** Only when a JWT template adds it; not a default Clerk claim. */
  email?: string;
};

/**
 * OAuth provider for Clerk. `domain` is the Frontend API URL (e.g.
 * `acme.clerk.accounts.dev`, or a production custom domain). Requires Dynamic
 * Client Registration enabled on the instance, and the OAuth application set to
 * issue JWT access tokens (opaque tokens can't be JWKS-verified).
 *
 * Clerk access tokens carry no `aud` claim, so there is no `audience` option —
 * verification is issuer + JWKS only (matching Clerk's own `mcpAuthClerk`).
 */
export function clerkProvider<
  TCustom extends Record<string, unknown> = Record<never, never>,
>(
  opts: { domain: string } & Omit<CustomProviderOptions, "issuer" | "audience">,
): Promise<OAuthConfig<ClerkClaims & TCustom & RegisteredClaims>> {
  const { domain, ...rest } = opts;
  return customProvider<ClerkClaims & TCustom>({
    issuer: toIssuerUrl(domain),
    ...rest,
  });
}

import type { OAuthConfig } from "../index.js";
import type { RegisteredClaims } from "../verify.js";
import { type CustomProviderOptions, customProvider } from "./custom.js";
import { toIssuerUrl } from "./shared.js";

/**
 * Claims a WorkOS AuthKit access token carries. All optional: `org_id`, `role`
 * and `permissions` appear only when an organization is selected at sign-in, and
 * `email` only when a JWT template adds it.
 *
 * @see https://workos.com/docs/authkit/sessions/integrating-sessions/access-token
 * @see https://workos.com/docs/authkit/jwt-templates
 */
export type WorkosClaims = {
  /** The WorkOS user id (the token's `sub`). */
  subject?: string;
  /** Session id, used for signing out. */
  sid?: string;
  /** Organization selected at sign-in. */
  org_id?: string;
  /** Role of the selected organization membership. */
  role?: string;
  /** Permissions assigned to the role. */
  permissions?: string[];
  /** Only when a JWT template adds it; not a default AuthKit claim. */
  email?: string;
};

/**
 * OAuth provider for WorkOS AuthKit. `domain` is the AuthKit domain, e.g.
 * `acme.authkit.app`. Requires DCR enabled in the WorkOS dashboard
 * (Connect → Configuration). `audience` is the MCP server's Resource Indicator.
 */
export function workosProvider<
  TCustom extends Record<string, unknown> = Record<never, never>,
>(
  opts: { domain: string; audience: string } & Omit<
    CustomProviderOptions,
    "issuer" | "audience"
  >,
): Promise<OAuthConfig<WorkosClaims & TCustom & RegisteredClaims>> {
  const { domain, ...rest } = opts;
  return customProvider<WorkosClaims & TCustom>({
    issuer: toIssuerUrl(domain),
    ...rest,
  });
}

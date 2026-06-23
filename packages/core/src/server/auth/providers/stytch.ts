import type { OAuthConfig } from "../index.js";
import { type CustomProviderOptions, customProvider } from "./custom.js";
import { toIssuerUrl } from "./shared.js";

/**
 * OAuth provider for Stytch Connected Apps. `domain` is the project domain,
 * e.g. `acme.customers.stytch.dev`, or a configured custom domain. Requires
 * DCR enabled in the Stytch dashboard. `audience` is the Stytch Project ID
 * (the default token audience).
 */
export function stytchProvider(
  opts: { domain: string; audience: string } & Omit<
    CustomProviderOptions,
    "issuer" | "audience"
  >,
): Promise<OAuthConfig> {
  const { domain, ...rest } = opts;
  return customProvider({ issuer: toIssuerUrl(domain), ...rest });
}

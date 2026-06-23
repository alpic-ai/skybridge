import type { OAuthConfig } from "../index.js";
import { type CustomProviderOptions, customProvider } from "./custom.js";
import { toIssuerUrl } from "./shared.js";

/**
 * OAuth provider for WorkOS AuthKit. `domain` is the AuthKit domain, e.g.
 * `acme.authkit.app`. Requires DCR enabled in the WorkOS dashboard
 * (Connect → Configuration). `audience` is the MCP server's Resource Indicator.
 */
export function workosProvider(
  opts: { domain: string; audience: string } & Omit<
    CustomProviderOptions,
    "issuer" | "audience"
  >,
): Promise<OAuthConfig> {
  const { domain, ...rest } = opts;
  return customProvider({ issuer: toIssuerUrl(domain), ...rest });
}

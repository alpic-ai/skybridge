import type { ExtraClaims } from "../../auth.js";
import type { OAuthConfig } from "../index.js";
import type { RegisteredClaims } from "../verify.js";
import { type CustomProviderOptions, customProvider } from "./custom.js";
import { toIssuerUrl } from "./shared.js";

/**
 * Claims a Stytch Connected Apps access token carries. Beyond the subject,
 * everything is project-configured through the client's access-token template.
 *
 * @see https://stytch.com/docs/api-reference/consumer/api/connected-apps/tokens/connected-app-access-token-object
 * @see https://stytch.com/docs/api/connected-apps-create
 */
export type StytchClaims = {
  /** Only when the client's access-token template adds it. */
  email?: string;
};

/**
 * OAuth provider for Stytch Connected Apps. `domain` is the project domain,
 * e.g. `acme.customers.stytch.dev`, or a configured custom domain. Requires
 * DCR enabled in the Stytch dashboard. `audience` is the Stytch Project ID
 * (the default token audience).
 */
export function stytchProvider<
  TCustom extends ExtraClaims = Record<never, never>,
>(
  opts: { domain: string; audience: string } & Omit<
    CustomProviderOptions,
    "issuer" | "audience"
  >,
): Promise<OAuthConfig<StytchClaims & TCustom & RegisteredClaims>> {
  const { domain, ...rest } = opts;
  return customProvider<StytchClaims & TCustom>({
    issuer: toIssuerUrl(domain),
    ...rest,
  });
}

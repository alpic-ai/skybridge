import type { ExtraClaims } from "../../auth.js";
import type { OAuthProvider } from "../index.js";
import type { RegisteredClaims } from "../verify.js";
import { type CustomProviderOptions, customProvider } from "./custom.js";
import { toIssuerUrl } from "./shared.js";

/**
 * Claims an Auth0 access token carries for a custom API audience. Auth0 puts no
 * user attributes beyond the id in the token, so there is no `email`: call
 * `/userinfo` for the profile. Custom claims must be namespaced (a bare `email`
 * key is silently dropped), so add them through the type parameter under their
 * full URI.
 *
 * @see https://auth0.com/docs/secure/tokens/access-tokens
 * @see https://auth0.com/docs/secure/tokens/json-web-tokens/create-custom-claims
 */
export type Auth0Claims = {
  /** Authorized party: the client id the token was issued to. */
  azp?: string;
  /** Only when the API has RBAC and "Add Permissions in the Access Token" on. */
  permissions?: string[];
  /** Organization id, when the tenant uses Organizations. */
  org_id?: string;
  /** Organization name, when the tenant uses Organizations. */
  org_name?: string;
};

/**
 * OAuth provider for Auth0. `domain` is the tenant domain (e.g.
 * `acme.us.auth0.com`); `audience` is the API Identifier; `serverUrl` is this
 * server's public URL. Requires DCR enabled on the tenant.
 *
 * Auth0 can't use the client's resource indicator — `audience` must be *in* the
 * authorize request. So it runs as skybridge-as-AS (`serverUrl`, see
 * {@link customProvider}) and bakes `?audience=<id>` into the advertised
 * `authorization_endpoint`. The token's `aud` is the API; `verify.issuer` stays
 * Auth0 (the token's real `iss`).
 */
export function auth0Provider<
  TCustom extends ExtraClaims = Record<never, never>,
>(
  opts: { domain: string; audience: string; serverUrl: string } & Omit<
    CustomProviderOptions,
    "issuer" | "audience" | "baseUrl" | "serverUrl"
  >,
): OAuthProvider<Auth0Claims & TCustom & RegisteredClaims> {
  const { domain, audience, ...rest } = opts;
  const provider = customProvider<Auth0Claims & TCustom>({
    issuer: toIssuerUrl(domain),
    audience,
    ...rest,
  });
  return {
    resolve: async () => {
      const config = await provider.resolve();
      const authUrl = new URL(config.oauthMetadata.authorization_endpoint);
      authUrl.searchParams.set("audience", audience);
      return {
        ...config,
        oauthMetadata: {
          ...config.oauthMetadata,
          authorization_endpoint: authUrl.href,
        },
      };
    },
  };
}

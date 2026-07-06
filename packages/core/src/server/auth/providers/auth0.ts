import type { OAuthConfig } from "../index.js";
import { type CustomProviderOptions, customProvider } from "./custom.js";
import { toIssuerUrl } from "./shared.js";

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
export async function auth0Provider(
  opts: { domain: string; audience: string; serverUrl: string } & Omit<
    CustomProviderOptions,
    "issuer" | "audience" | "baseUrl" | "serverUrl"
  >,
): Promise<OAuthConfig> {
  const { domain, audience, ...rest } = opts;
  const config = await customProvider({
    issuer: toIssuerUrl(domain),
    audience,
    ...rest,
  });
  const authUrl = new URL(config.oauthMetadata.authorization_endpoint);
  authUrl.searchParams.set("audience", audience);
  return {
    ...config,
    oauthMetadata: {
      ...config.oauthMetadata,
      authorization_endpoint: authUrl.href,
    },
  };
}

import type { OAuthMetadata } from "@modelcontextprotocol/sdk/shared/auth.js";
import {
  type DiscoveredMetadata,
  discoverAuthorizationServer,
} from "../discovery.js";
import type { OAuthConfig } from "../index.js";

/** Options accepted by {@link customProvider} and the branded providers. */
export type CustomProviderOptions = {
  issuer: string;
  /** Expected token `aud`. Omit to skip audience verification — only for IdPs
   * that don't bind an audience (e.g. Clerk). Branded providers whose IdP does
   * bind an audience re-require it in their own options. */
  audience?: string;
  /** Omit to let the server infer the resource origin from request headers. */
  baseUrl?: string;
  /** Advertise THIS server as the authorization server (skybridge-as-AS): the
   * served AS metadata `issuer` and the PRM `authorization_servers` use this URL
   * instead of the IdP's. Needed when skybridge must sit in the auth path — Auth0
   * (the `audience` must be baked into `/authorize`) or the Alpic DCR proxy (Alpic
   * injects the registration endpoint). Use the static public URL; `verify.issuer`
   * stays the IdP (the token's real `iss`). */
  serverUrl?: string;
  scopes?: string[];
  requiredScopes?: string[];
  metadataOverrides?: Omit<Partial<OAuthMetadata>, "issuer">;
};

/** Builds a complete {@link OAuthConfig} from an IdP's OAuth discovery document. */
export async function customProvider(
  opts: CustomProviderOptions,
): Promise<OAuthConfig> {
  const discovered = await discoverAuthorizationServer(opts.issuer);

  // JWKS verification needs a signing-key URL; without it the server can't verify
  // tokens. (`registration_endpoint` is optional per RFC 8414 — a no-DCR IdP simply
  // omits it; a proxy like Alpic, or pre-registered clients, supply registration.)
  if (!discovered.jwks_uri) {
    throw new Error(
      `${opts.issuer} discovery has no jwks_uri; JWKS verification requires it.`,
    );
  }

  // Overrides adjust only advertised metadata; the trust anchor (issuer, jwks_uri)
  // always comes from validated discovery.
  const {
    issuer: _issuer,
    jwks_uri: _jwks,
    ...overrides
  }: Partial<DiscoveredMetadata> = opts.metadataOverrides ?? {};
  const base: DiscoveredMetadata = { ...discovered, ...overrides };
  const scopesSupported = opts.scopes ?? base.scopes_supported;

  // serverUrl => skybridge-as-AS: advertise this server's URL as the issuer (and
  // keep the served scopes in sync). The verifier still trusts the IdP's `iss`.
  const oauthMetadata: DiscoveredMetadata = opts.serverUrl
    ? {
        ...base,
        issuer: opts.serverUrl.replace(/\/$/, ""),
        scopes_supported: scopesSupported,
      }
    : base;

  return {
    baseUrl: opts.baseUrl,
    oauthMetadata,
    verify: {
      issuer: discovered.issuer,
      audience: opts.audience,
      jwksUri: discovered.jwks_uri,
    },
    scopesSupported,
    requiredScopes: opts.requiredScopes,
  };
}

import type { OAuthMetadata } from "@modelcontextprotocol/server";
import type { ExtraClaims } from "../../auth.js";
import {
  type DiscoveredMetadata,
  discoverAuthorizationServer,
} from "../discovery.js";
import type { OAuthConfig, OAuthProvider } from "../index.js";
import { createJwksVerifier, type RegisteredClaims } from "../verify.js";

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
  /** Advertise this URL as the authorization server (served AS metadata `issuer`
   * and PRM `authorization_servers`). Its own discovery document supplies the
   * advertised endpoints, DCR registration, scopes and the `iss` tokens are
   * verified against; only `jwks_uri` still comes from `issuer`'s document. Use
   * when DCR/authorize/token live at a different URL than the discovery issuer
   * (e.g. Descope's agentic URL vs. its base-project URL). `serverUrl` wins if
   * both are set. */
  authorizationServer?: string;
  scopes?: string[];
  requiredScopes?: string[];
  metadataOverrides?: Omit<Partial<OAuthMetadata>, "issuer">;
};

/**
 * Builds a complete {@link OAuthConfig} from an IdP's OAuth discovery document.
 *
 * @typeParam TExtra - Claims the IdP puts in the access token, reaching handlers
 * as `extra.authInfo.extra`. The branded providers pass their documented claims;
 * pass your own when wiring an IdP by hand.
 */
export function customProvider<TExtra extends ExtraClaims = ExtraClaims>(
  opts: CustomProviderOptions,
): OAuthProvider<TExtra & RegisteredClaims> {
  return { resolve: () => resolveCustomProvider<TExtra>(opts) };
}

async function resolveCustomProvider<TExtra extends ExtraClaims>(
  opts: CustomProviderOptions,
): Promise<OAuthConfig<TExtra & RegisteredClaims>> {
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
  let advertised = discovered;
  if (opts.authorizationServer) {
    try {
      advertised = await discoverAuthorizationServer(opts.authorizationServer);
    } catch (err) {
      console.warn(
        `OAuth discovery failed for authorizationServer ${opts.authorizationServer}; advertising ${opts.issuer} metadata instead: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  const base: DiscoveredMetadata = { ...advertised, ...overrides };
  const scopesSupported = opts.scopes ?? base.scopes_supported;

  // serverUrl (skybridge-as-AS) overrides the advertised issuer, keeping the
  // IdP as the token issuer. authorizationServer re-asserts its own URL so a
  // failed AS discovery still points clients at the AS. serverUrl wins.
  const advertisedIssuer =
    opts.serverUrl?.replace(/\/$/, "") ??
    opts.authorizationServer?.replace(/\/$/, "");
  const oauthMetadata: DiscoveredMetadata = advertisedIssuer
    ? {
        ...base,
        issuer: advertisedIssuer,
        scopes_supported: scopesSupported,
      }
    : base;

  return {
    baseUrl: opts.baseUrl,
    oauthMetadata,
    verifier: createJwksVerifier<TExtra>({
      issuer: advertised.issuer,
      audience: opts.audience,
      jwksUri: advertised.jwks_uri ?? discovered.jwks_uri,
    }),
    scopesSupported,
    requiredScopes: opts.requiredScopes,
  };
}

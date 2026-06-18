import type { OAuthMetadata } from "@modelcontextprotocol/sdk/shared/auth.js";
import {
  type DiscoveredMetadata,
  discoverAuthorizationServer,
} from "../discovery.js";
import type { OAuthConfig } from "../index.js";

/** Builds a complete {@link OAuthConfig} for a DCR-compatible IdP via discovery. */
export async function customProvider(opts: {
  issuer: string;
  audience: string;
  /** Omit to let the server infer the resource origin from request headers. */
  baseUrl?: string;
  scopes?: string[];
  requiredScopes?: string[];
  metadataOverrides?: Omit<Partial<OAuthMetadata>, "issuer">;
}): Promise<OAuthConfig> {
  const discovered = await discoverAuthorizationServer(opts.issuer);

  // The IdP's own discovery must advertise DCR and a JWKS; overrides can't fake it.
  if (!discovered.registration_endpoint) {
    throw new Error(
      `${opts.issuer} is not DCR-compatible (no registration_endpoint); customProvider only supports DCR IdPs.`,
    );
  }
  if (!discovered.jwks_uri) {
    throw new Error(
      `${opts.issuer} discovery has no jwks_uri; JWKS verification requires it.`,
    );
  }

  // Overrides adjust only advertised metadata (e.g. proxied endpoints). The
  // trust anchor (issuer, jwks_uri) always comes from validated discovery.
  const {
    issuer: _issuer,
    jwks_uri: _jwks,
    ...overrides
  } = (opts.metadataOverrides ?? {}) as Partial<DiscoveredMetadata>;
  const oauthMetadata: DiscoveredMetadata = { ...discovered, ...overrides };

  return {
    baseUrl: opts.baseUrl,
    oauthMetadata,
    verify: {
      issuer: discovered.issuer,
      audience: opts.audience,
      jwksUri: discovered.jwks_uri,
    },
    scopesSupported: opts.scopes ?? oauthMetadata.scopes_supported,
    requiredScopes: opts.requiredScopes,
  };
}

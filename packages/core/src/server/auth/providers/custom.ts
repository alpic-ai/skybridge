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
  baseUrl: string;
  scopes?: string[];
  requiredScopes?: string[];
  enforcement?: "required" | "optional";
  metadataOverrides?: Partial<OAuthMetadata>;
}): Promise<OAuthConfig> {
  const discovered = await discoverAuthorizationServer(opts.issuer);
  const oauthMetadata: DiscoveredMetadata = {
    ...discovered,
    ...opts.metadataOverrides,
  };

  if (!oauthMetadata.registration_endpoint) {
    throw new Error(
      `${opts.issuer} is not DCR-compatible (no registration_endpoint); customProvider only supports DCR IdPs.`,
    );
  }
  if (!oauthMetadata.jwks_uri) {
    throw new Error(
      `${opts.issuer} discovery has no jwks_uri; JWKS verification requires it.`,
    );
  }

  return {
    baseUrl: opts.baseUrl,
    oauthMetadata,
    verify: {
      issuer: oauthMetadata.issuer,
      audience: opts.audience,
      jwksUri: oauthMetadata.jwks_uri,
    },
    scopesSupported: opts.scopes ?? oauthMetadata.scopes_supported,
    requiredScopes: opts.requiredScopes,
    enforcement: opts.enforcement,
  };
}

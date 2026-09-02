import type { OAuthMetadata } from "@modelcontextprotocol/server";
import type { ExtraClaims, TokenVerifier } from "../auth.js";

/**
 * Resource-server OAuth config for the `oauth` field of `SkybridgeConfig`.
 *
 * `TExtra` comes from the `verifier` and flows on to tool handlers and
 * `mcpMiddleware`, so the claim shape is declared once by whoever checks the
 * token. The branded providers set it from the claims their IdP documents.
 *
 * @typeParam TExtra - Claims the verifier populates in `AuthInfo["extra"]`.
 */
export type OAuthConfig<TExtra extends ExtraClaims = ExtraClaims> = {
  /**
   * Public URL of this server; sets `resourceServerUrl` and the
   * `resource_metadata` URL. When omitted, it is inferred per request from
   * `x-forwarded-host`/`origin`/`host` headers.
   */
  baseUrl?: string;
  /** AS metadata served at `/.well-known/oauth-authorization-server`. */
  oauthMetadata: OAuthMetadata;
  /** Scopes advertised in protected-resource metadata. */
  scopesSupported?: string[];
  /** Server-wide required-scope floor. */
  requiredScopes?: string[];
  /**
   * Checks each bearer token. Build one with `createJwksVerifier` for a
   * JWT-issuing IdP, or supply your own for opaque tokens.
   */
  verifier: TokenVerifier<TExtra>;
};

/**
 * What the branded providers return: a deferred {@link OAuthConfig}. Discovery
 * runs in `resolve`, so `oauth: auth0Provider(...)` at module scope performs
 * no network access until `Skybridge.run`. Call `resolve` yourself
 * (`await customProvider(...).resolve()`) when wiring the middleware by hand.
 */
export type OAuthProvider<TExtra extends ExtraClaims = ExtraClaims> = {
  resolve: () => Promise<OAuthConfig<TExtra>>;
};

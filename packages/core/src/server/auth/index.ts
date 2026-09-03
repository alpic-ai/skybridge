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
 *
 * This is an object rather than a bare `() => Promise<OAuthConfig>` on
 * purpose. TypeScript defers, during the first inference pass, any argument
 * that is a call to a generic function returning a function type. The
 * providers are generic (`workosProvider<TCustom>`), so a function-shaped
 * return written inline in `new Skybridge({ oauth: workosProvider(...) })`
 * would be skipped and `TAuthExtra` would fall back to `ExtraClaims`, losing
 * the claims typing in tool handlers. A non-function shape is inferred
 * eagerly.
 */
export type OAuthProvider<TExtra extends ExtraClaims = ExtraClaims> = {
  resolve: () => Promise<OAuthConfig<TExtra>>;
};

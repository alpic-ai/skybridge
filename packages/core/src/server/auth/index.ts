import type { OAuthMetadata } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { TokenVerifier } from "../auth.js";
import type { JwksVerifyConfig } from "./verify.js";

/**
 * Resource-server OAuth config for `SkybridgeServerOptions.oauth`.
 *
 * Supply either a `verifier` or the legacy `verify` parameters, never both.
 * `TExtra` comes from the `verifier` and flows on to tool handlers and
 * `mcpMiddleware`, so the claim shape is declared once by whoever checks the
 * token. The branded providers set it from the claims their IdP documents.
 *
 * @typeParam TExtra - Claims the verifier populates in `AuthInfo["extra"]`.
 */
export type OAuthConfig<
  TExtra extends Record<string, unknown> = Record<string, unknown>,
> = {
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
} & (
  | {
      /**
       * Checks each bearer token. Build one with `createJwksVerifier` for a
       * JWT-issuing IdP, or supply your own for opaque tokens.
       */
      verifier: TokenVerifier<TExtra>;
      verify?: never;
    }
  | {
      /**
       * JWKS verification parameters, used to build the verifier.
       *
       * @deprecated Pass `verifier: createJwksVerifier({ … })` instead, which
       * also types the claims handlers receive. Claims stay
       * `Record<string, unknown>` on this path.
       */
      verify: JwksVerifyConfig;
      verifier?: never;
    }
);

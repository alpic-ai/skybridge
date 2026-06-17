import type { OAuthMetadata } from "@modelcontextprotocol/sdk/shared/auth.js";
import type { JwksVerifyConfig } from "./verify.js";

/**
 * Resource-server OAuth configuration passed to `McpServer` via
 * `SkybridgeServerOptions.oauth`. Accepts a raw object or a branded provider
 * (SKY-447) that returns one. Remote-auth only: the MCP client runs the OAuth
 * flow directly against the upstream IdP; this server only advertises the
 * well-known metadata and verifies bearer tokens.
 */
export type OAuthConfig = {
  /**
   * Public base URL of this resource server (e.g. `https://app.example.com`).
   * Used for the served `resourceServerUrl` and the `resource_metadata` URL
   * advertised in 401 `WWW-Authenticate` headers. Developer-supplied — the
   * framework never reads `process.env` for it.
   */
  baseUrl: string;

  /**
   * Authorization-server metadata served verbatim at
   * `/.well-known/oauth-authorization-server`. Its endpoints point at the
   * upstream IdP. Branded providers (SKY-447) fill this in.
   */
  oauthMetadata: OAuthMetadata;

  /** JWKS-based token verification (`jose`). */
  verify: JwksVerifyConfig;

  /** Scopes advertised in the protected-resource metadata. */
  scopesSupported?: string[];

  /** Server-wide required-scope floor enforced by `requireBearerAuth`. */
  requiredScopes?: string[];
};

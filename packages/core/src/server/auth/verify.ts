import { InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type { OAuthTokenVerifier } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import * as jose from "jose";

export type JwksVerifyConfig = {
  /** Expected `iss` claim. */
  issuer: string;
  /** Expected `aud` claim. Omit to skip audience verification — for IdPs that
   * don't bind an audience to their access tokens (e.g. Clerk). */
  audience?: string;
  /** Defaults to `${issuer}/.well-known/jwks.json`. */
  jwksUri?: string;
};

/** Builds an `OAuthTokenVerifier` validating JWTs against a remote JWKS. Internal, not exported. */
export function createJwksVerifier(
  config: JwksVerifyConfig,
): OAuthTokenVerifier {
  const jwksUri =
    config.jwksUri ??
    `${config.issuer.replace(/\/$/, "")}/.well-known/jwks.json`;
  const jwks = jose.createRemoteJWKSet(new URL(jwksUri));

  return {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      let payload: jose.JWTPayload;
      try {
        ({ payload } = await jose.jwtVerify(token, jwks, {
          issuer: config.issuer,
          // jose skips the aud check when `audience` is undefined.
          ...(config.audience !== undefined && { audience: config.audience }),
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // This reaches the `error_description` of a `WWW-Authenticate`
        // challenge, whose value must not include characters outside
        // %x20-21 / %x23-5B / %x5D-7E (OAuth 2.1 §5.3.1, RFC 6750 §3). jose
        // quotes claim names in its messages, and a quote would end the
        // parameter early, dropping the `resource_metadata` that follows it.
        // Each run becomes a space rather than being dropped, so removing one
        // never runs two words together.
        const safe = message
          .replace(/[^\x20-\x21\x23-\x5B\x5D-\x7E]+/g, " ")
          .trim();
        throw new InvalidTokenError(`Token verification failed: ${safe}`);
      }

      const { client_id, scope, exp, sub, ...rest } = payload as Record<
        string,
        unknown
      > & {
        client_id?: string;
        scope?: string | string[];
        exp?: number;
        sub?: string;
      };

      const scopes = Array.isArray(scope)
        ? scope.map(String)
        : typeof scope === "string"
          ? scope.split(/\s+/).filter(Boolean)
          : [];

      return {
        token,
        clientId: client_id ?? "",
        scopes,
        expiresAt: exp,
        extra: { subject: sub, ...rest },
      } satisfies AuthInfo;
    },
  };
}

import { InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type { OAuthTokenVerifier } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import * as jose from "jose";

/** JWKS-based access-token verification settings. */
export type JwksVerifyConfig = {
  /** Expected `iss` claim. */
  issuer: string;
  /** Expected `aud` claim. */
  audience: string;
  /** JWKS URL. Defaults to `${issuer}/.well-known/jwks.json`. */
  jwksUri?: string;
};

/**
 * Builds an SDK `OAuthTokenVerifier` that validates JWT access tokens against a
 * remote JWKS using `jose`. Internal to the package — branded providers
 * (SKY-447) reuse it; it is never exported from `skybridge/server`.
 */
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
          audience: config.audience,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new InvalidTokenError(`Token verification failed: ${message}`);
      }

      const { client_id, scope, exp, sub, ...rest } = payload as Record<
        string,
        unknown
      > & { client_id?: string; scope?: string; exp?: number; sub?: string };

      return {
        token,
        clientId: client_id ?? "",
        scopes: typeof scope === "string" ? scope.split(" ") : [],
        expiresAt: exp,
        extra: { subject: sub, ...rest },
      } satisfies AuthInfo;
    },
  };
}

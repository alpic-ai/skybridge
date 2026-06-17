import { InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type { OAuthTokenVerifier } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import * as jose from "jose";

export type JwksVerifyConfig = {
  /** Expected `iss` claim. */
  issuer: string;
  /** Expected `aud` claim. */
  audience: string;
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

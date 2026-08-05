import { InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import * as jose from "jose";
import type { AuthInfo, ExtraClaims, TokenVerifier } from "../auth.js";

export type JwksVerifyConfig = {
  /** Expected `iss` claim. */
  issuer: string;
  /** Expected `aud` claim. Omit to skip audience verification — for IdPs that
   * don't bind an audience to their access tokens (e.g. Clerk). */
  audience?: string;
  /** Defaults to `${issuer}/.well-known/jwks.json`. */
  jwksUri?: string;
};

/**
 * Claims a JWKS-verified token always carries into `extra`, whatever the IdP:
 * `subject` (the renamed `sub`) plus the registered claims that survive the
 * mapping. `client_id`, `scope` and `exp` do not appear here, since they become
 * `AuthInfo` fields instead. Intersected into every claim shape a JWKS verifier
 * resolves.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7519#section-4.1
 */
export type RegisteredClaims = {
  /** The token's `sub`, renamed on the way into `extra`. */
  subject?: string;
  /** Issuer of the token. */
  iss?: string;
  /** Audience the token was minted for. */
  aud?: string | string[];
  /** Issued-at, in unix seconds. */
  iat?: number;
  /** Not-valid-before, in unix seconds. */
  nbf?: number;
  /** Unique token id. */
  jti?: string;
};

/**
 * Builds a {@link TokenVerifier} that validates JWTs against a remote JWKS.
 *
 * `extra` receives the token's claims with `sub` renamed to `subject`, minus
 * `client_id`, `scope` and `exp`, which map onto `AuthInfo` fields instead. Pass
 * `TExtra` to declare what your IdP puts there; the branded providers do this
 * for you. {@link RegisteredClaims} is always included, since those claims
 * survive the mapping.
 *
 * @typeParam TExtra - Claims the verified token carries in `extra`. An
 * assertion, not a runtime check: nothing rejects a token whose claims differ.
 */
export function createJwksVerifier<TExtra extends ExtraClaims = ExtraClaims>(
  config: JwksVerifyConfig,
): TokenVerifier<TExtra & RegisteredClaims> {
  if (!config.issuer) {
    throw new Error("createJwksVerifier requires an `issuer`");
  }
  const jwksUri =
    config.jwksUri ??
    `${config.issuer.replace(/\/$/, "")}/.well-known/jwks.json`;
  const jwks = jose.createRemoteJWKSet(new URL(jwksUri));

  return {
    async verifyAccessToken(
      token: string,
    ): Promise<AuthInfo<TExtra & RegisteredClaims>> {
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
        extra: { subject: sub, ...rest } as unknown as TExtra &
          RegisteredClaims,
      };
    },
  };
}

import {
  type BearerAuthMiddlewareOptions,
  requireBearerAuth,
} from "@modelcontextprotocol/express";
import type { AuthInfo as SdkAuthInfo } from "@modelcontextprotocol/server";

import type { RequestHandler } from "express";

export {
  type AuthMetadataOptions,
  type BearerAuthMiddlewareOptions,
  mcpAuthMetadataRouter,
  requireBearerAuth,
} from "@modelcontextprotocol/express";
export { OAuthError } from "@modelcontextprotocol/server";
/** Claims a verifier puts in `AuthInfo["extra"]`: any JSON-ish bag of them. */
export type ExtraClaims = Record<string, unknown>;

/**
 * A validated access token, as resolved by a
 * [verifier](https://docs.skybridge.tech/api-reference/verifier) and handed to
 * handlers on `extra.authInfo`.
 *
 * Unparameterized, `extra` stays the SDK's `Record<string, unknown>` bag. The
 * claims are owned by whoever verifies the token: parameterize the verifier and
 * the shape flows through {@link OAuthConfig} to every handler.
 *
 * @typeParam TExtra - Claims populated in `extra`.
 *
 * @example
 * ```ts
 * type Claims = { subject?: string; email?: string };
 *
 * async function verifyAccessToken(token: string): Promise<AuthInfo<Claims>> {
 *   // ...
 * }
 * ```
 */
export type AuthInfo<TExtra extends ExtraClaims = ExtraClaims> = Omit<
  SdkAuthInfo,
  "extra"
> & { extra?: TExtra };

/**
 * Checks a bearer token and resolves the claims it carries. The type parameter
 * is what makes `extra.authInfo.extra` typed downstream, so a verifier is the
 * single source for the claim shape.
 *
 * Pass one to {@link requireBearerAuth} or {@link optionalBearerAuth} directly,
 * or hand it to the `oauth` server option inside an {@link OAuthConfig}.
 *
 * @typeParam TExtra - Claims this verifier populates in `AuthInfo["extra"]`.
 */
export type TokenVerifier<TExtra extends ExtraClaims = ExtraClaims> = {
  verifyAccessToken(token: string): Promise<AuthInfo<TExtra>>;
};

/**
 * Like `requireBearerAuth`, but lets requests through when no
 * `Authorization` header is present. Used for mixed-auth servers where some
 * tools are public and others require sign-in: each tool enforces its own
 * `securitySchemes` against `extra.authInfo`.
 *
 * Behavior:
 * - No `Authorization` header → `next()` without `req.auth`.
 * - Valid Bearer token → `req.auth` set, same as `requireBearerAuth`.
 * - Invalid / malformed / expired / insufficient-scope → same error response
 *   as `requireBearerAuth` (401/403). Sending a bad token is still a client
 *   error.
 */
export function optionalBearerAuth(
  options: BearerAuthMiddlewareOptions,
): RequestHandler {
  const required = requireBearerAuth(options);
  return (req, res, next) => {
    if (!req.headers.authorization) {
      next();
      return;
    }
    return required(req, res, next);
  };
}

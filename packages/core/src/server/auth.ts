import {
  type BearerAuthMiddlewareOptions,
  requireBearerAuth,
} from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import type { AuthInfo as SdkAuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

import type { RequestHandler } from "express";

export { InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
export {
  type BearerAuthMiddlewareOptions,
  requireBearerAuth,
} from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
export {
  type AuthMetadataOptions,
  mcpAuthMetadataRouter,
} from "@modelcontextprotocol/sdk/server/auth/router.js";
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
export type AuthInfo<
  TExtra extends Record<string, unknown> = Record<string, unknown>,
> = Omit<SdkAuthInfo, "extra"> & { extra?: TExtra };

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
export type TokenVerifier<
  TExtra extends Record<string, unknown> = Record<string, unknown>,
> = {
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

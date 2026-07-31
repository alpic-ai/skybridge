import {
  type BearerAuthMiddlewareOptions,
  requireBearerAuth,
} from "@modelcontextprotocol/express";

import type { RequestHandler } from "express";

export {
  type AuthMetadataOptions,
  type BearerAuthMiddlewareOptions,
  mcpAuthMetadataRouter,
  requireBearerAuth,
} from "@modelcontextprotocol/express";
export type { AuthInfo } from "@modelcontextprotocol/server";
export { OAuthError } from "@modelcontextprotocol/server";

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

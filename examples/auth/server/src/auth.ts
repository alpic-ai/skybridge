import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { WorkOS } from "@workos-inc/node";
import * as jose from "jose";
import { env } from "./env.js";

// Initialize JWKS client for AuthKit public key verification
const jwks = jose.createRemoteJWKSet(
  new URL(`https://${env.AUTHKIT_DOMAIN}/oauth2/jwks`),
);

// Initialize WorkOS client
const workos = new WorkOS(env.WORKOS_API_KEY);

/**
 * Verify a Bearer JWT and return AuthInfo for the MCP SDK.
 * Used with `requireBearerAuth({ verifier: { verifyAccessToken } })`.
 */
export async function verifyAccessToken(token: string): Promise<AuthInfo> {
  const { payload } = await jose.jwtVerify(token, jwks, {
    issuer: `https://${env.AUTHKIT_DOMAIN}`,
  });

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Invalid token: missing sub claim");
  }

  const user = await workos.userManagement.getUser(payload.sub);

  return {
    token,
    clientId: user.id,
    scopes: [],
    extra: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  };
}

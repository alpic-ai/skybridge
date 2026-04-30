import { InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import * as jose from "jose";
import { env } from "./env.js";

let jwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks) {
    const domain = env.STYTCH_DOMAIN.replace(/\/$/, "");
    jwks = jose.createRemoteJWKSet(new URL(`${domain}/.well-known/jwks.json`));
  }
  return jwks;
}

export async function verifyAccessToken(token: string): Promise<AuthInfo> {
  let payload: jose.JWTPayload;

  try {
    ({ payload } = await jose.jwtVerify(token, getJWKS(), {
      issuer: env.STYTCH_DOMAIN.replace(/\/$/, ""),
      audience: env.STYTCH_PROJECT_ID,
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
}

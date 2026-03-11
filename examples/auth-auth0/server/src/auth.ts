import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import * as jose from "jose";
import { env } from "./env.js";
import { InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";

interface UserClaims extends Record<string, unknown> {
  sub: string;
  email?: string;
  name?: string;
}

let jwksClient: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getJwksClient() {
  if (!jwksClient) {
    const jwksUrl = new URL(
      `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`,
    );
    jwksClient = jose.createRemoteJWKSet(jwksUrl);
  }
  return jwksClient;
}

export async function verifyAccessToken(token: string): Promise<AuthInfo> {
  const issuer = `https://${env.AUTH0_DOMAIN}/`;

  let payload: jose.JWTPayload;
  try {
    ({ payload } = await jose.jwtVerify(token, getJwksClient(), {
      issuer,
      audience: env.AUTH0_AUDIENCE,
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new InvalidTokenError(`Token verification failed: ${message}`);
  }

  const userClaims: UserClaims = {
    sub: payload.sub ?? "",
    email: payload.email as string | undefined,
    name: payload.name as string | undefined,
  };

  return {
    token,
    clientId: userClaims.sub,
    scopes: [],
    extra: userClaims,
    expiresAt: payload.exp,
  };
}

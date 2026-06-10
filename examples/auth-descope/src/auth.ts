import * as jose from "jose";
import { type AuthInfo, InvalidTokenError } from "skybridge/server";
import { env } from "./env.js";

// Issuer URL for the Descope MCP Server (Agentic Identity Hub)
export const DESCOPE_MCP_ISSUER = `https://api.descope.com/v1/apps/agentic/${env.DESCOPE_PROJECT_ID}/${env.DESCOPE_MCP_SERVER_ID}`;

// JWKS is shared across all MCP servers within a Descope project
const jwks = jose.createRemoteJWKSet(
  new URL(`https://api.descope.com/${env.DESCOPE_PROJECT_ID}/.well-known/jwks.json`),
);

// Must match the "MCP Server URL" set in Descope Console (added as aud claim)
const MCP_AUDIENCE = `${env.SERVER_URL}/mcp`;

export async function verifyAccessToken(token: string): Promise<AuthInfo> {
  try {
    const { payload } = await jose.jwtVerify(token, jwks, {
      issuer: DESCOPE_MCP_ISSUER,
      audience: MCP_AUDIENCE,
    });

    return {
      token,
      clientId: payload.sub as string,
      scopes:
        typeof payload.scope === "string"
          ? payload.scope.split(" ").filter(Boolean)
          : [],
      expiresAt: payload.exp,
      extra: {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
      },
    };
  } catch (err) {
    throw new InvalidTokenError(
      `Descope token verification failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
}
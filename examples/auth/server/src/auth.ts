import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { WorkOS } from "@workos-inc/node";
import * as jose from "jose";
import { env } from "./env.js";

type Extra = RequestHandlerExtra<ServerRequest, ServerNotification>;

// Initialize JWKS client for AuthKit public key verification
const jwks = jose.createRemoteJWKSet(
  new URL(`https://${env.AUTHKIT_DOMAIN}/oauth2/jwks`),
);

// Initialize WorkOS client
const workos = new WorkOS(env.WORKOS_API_KEY);

interface AuthResult {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export async function tryGetAuth(
  extra: Extra,
): Promise<AuthResult | undefined> {
  const authHeader = extra.requestInfo?.headers?.authorization;
  if (!authHeader) {
    return undefined;
  }

  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!headerValue?.toLowerCase().startsWith("bearer ")) {
    return undefined;
  }

  const token = headerValue.slice(7).trim();
  if (!token) {
    return undefined;
  }

  try {
    const { payload } = await jose.jwtVerify(token, jwks, {
      issuer: `https://${env.AUTHKIT_DOMAIN}`,
    });

    if (!payload.sub || typeof payload.sub !== "string") {
      return undefined;
    }

    const user = await workos.userManagement.getUser(payload.sub);

    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  } catch {
    return undefined;
  }
}

export async function getUserId(extra: Extra): Promise<string | undefined> {
  const auth = await tryGetAuth(extra);
  return auth?.userId;
}

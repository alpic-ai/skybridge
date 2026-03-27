import {
  ApiClient,
  VerifyAccessTokenError,
  InvalidRequestError,
} from "@auth0/auth0-api-js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { env } from "./env.js";

const apiClient = new ApiClient({
  domain: env.AUTH0_DOMAIN,
  audience: env.AUTH0_AUDIENCE,
});

export async function verifyAccessToken(token: string): Promise<AuthInfo> {
  try {
    const decoded = await apiClient.verifyAccessToken({
      accessToken: token,
    });

    return {
      token,
      clientId: decoded?.azp as string,
      scopes:
        typeof decoded.scope === "string"
          ? decoded.scope.split(" ").filter(Boolean)
          : [],
      extra: {
        sub: decoded?.sub as string,
      },
      expiresAt: decoded.exp,
    };
  } catch (err) {
    if (
      err instanceof VerifyAccessTokenError ||
      err instanceof InvalidRequestError
    ) {
      throw new InvalidTokenError(`Token verification failed: ${err.message}`);
    }
    throw err;
  }
}

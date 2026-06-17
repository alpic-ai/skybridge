import {
  getOAuthProtectedResourceMetadataUrl,
  mcpAuthMetadataRouter,
} from "@modelcontextprotocol/sdk/server/auth/router.js";
import type { Express } from "express";
import { optionalBearerAuth, requireBearerAuth } from "../auth.js";
import type { OAuthConfig } from "./index.js";
import { createJwksVerifier } from "./verify.js";

/** Mounts the well-known OAuth metadata and bearer auth on `/mcp`. */
export function setupOAuth(app: Express, config: OAuthConfig): void {
  let baseUrl: URL;
  try {
    baseUrl = new URL(config.baseUrl);
  } catch {
    throw new Error(
      `oauth.baseUrl must be a valid absolute URL, got: ${JSON.stringify(
        config.baseUrl,
      )}`,
    );
  }
  if (!config.verify?.issuer || !config.verify?.audience) {
    throw new Error("oauth.verify requires both `issuer` and `audience`");
  }

  app.use(
    mcpAuthMetadataRouter({
      oauthMetadata: config.oauthMetadata,
      resourceServerUrl: baseUrl,
      scopesSupported: config.scopesSupported,
    }),
  );

  const bearer =
    config.enforcement === "optional" ? optionalBearerAuth : requireBearerAuth;
  app.use(
    "/mcp",
    bearer({
      verifier: createJwksVerifier(config.verify),
      requiredScopes: config.requiredScopes,
      resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(baseUrl),
    }),
  );
}

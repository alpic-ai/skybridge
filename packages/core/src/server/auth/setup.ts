import {
  getOAuthProtectedResourceMetadataUrl,
  mcpAuthMetadataRouter,
} from "@modelcontextprotocol/sdk/server/auth/router.js";
import type { Express } from "express";
import { optionalBearerAuth, requireBearerAuth } from "../auth.js";
import type { OAuthConfig } from "./index.js";
import { createJwksVerifier } from "./verify.js";

/**
 * Wires resource-server OAuth into the embedded Express app: serves the
 * well-known metadata and enforces bearer auth on `/mcp`. Called from the
 * `McpServer` constructor before any user middleware and the `/mcp` route.
 */
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

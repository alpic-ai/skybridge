import {
  getOAuthProtectedResourceMetadataUrl,
  mcpAuthMetadataRouter,
} from "@modelcontextprotocol/sdk/server/auth/router.js";
import cors from "cors";
import type { Express, Request } from "express";
import { optionalBearerAuth, requireBearerAuth } from "../auth.js";
import { resolveServerOrigin } from "../requestOrigin.js";
import type { OAuthConfig } from "./index.js";
import { createJwksVerifier } from "./verify.js";

/** Mounts the well-known OAuth metadata and bearer auth on `/mcp`. */
export function setupOAuth(app: Express, config: OAuthConfig): void {
  if (!config.verify?.issuer || !config.verify?.audience) {
    throw new Error("oauth.verify requires both `issuer` and `audience`");
  }

  const verifier = createJwksVerifier(config.verify);
  const bearer =
    config.enforcement === "optional" ? optionalBearerAuth : requireBearerAuth;

  // baseUrl known at boot: bake the resource URLs once, no Host-header trust.
  if (config.baseUrl !== undefined) {
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
    app.use(
      mcpAuthMetadataRouter({
        oauthMetadata: config.oauthMetadata,
        resourceServerUrl: baseUrl,
        scopesSupported: config.scopesSupported,
      }),
    );
    app.use(
      "/mcp",
      bearer({
        verifier,
        requiredScopes: config.requiredScopes,
        resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(baseUrl),
      }),
    );
    return;
  }

  // No baseUrl: resolve the resource origin per request from forwarded headers
  // (same precedence the framework uses for view serverUrl). Origin headers are
  // pathless, so the PRM path stays at root, matching the SDK's static layout.
  const resolveOrigin = (req: Request) =>
    new URL(resolveServerOrigin((key) => req.get(key)));

  app.use(
    "/.well-known/oauth-authorization-server",
    cors(),
    (_req, res) => void res.json(config.oauthMetadata),
  );
  app.use("/.well-known/oauth-protected-resource", cors(), (req, res) => {
    res.json({
      resource: resolveOrigin(req).href,
      authorization_servers: [config.oauthMetadata.issuer],
      scopes_supported: config.scopesSupported,
    });
  });
  app.use("/mcp", (req, res, next) =>
    bearer({
      verifier,
      requiredScopes: config.requiredScopes,
      resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(
        resolveOrigin(req),
      ),
    })(req, res, next),
  );
}

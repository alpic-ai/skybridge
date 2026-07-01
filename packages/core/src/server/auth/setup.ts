import type { BearerAuthMiddlewareOptions } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import {
  getOAuthProtectedResourceMetadataUrl,
  mcpAuthMetadataRouter,
} from "@modelcontextprotocol/sdk/server/auth/router.js";
import cors from "cors";
import type { Express, Request, RequestHandler } from "express";
import type { AuthInfo } from "../auth.js";
import { optionalBearerAuth, requireBearerAuth } from "../auth.js";
import { resolveServerOrigin } from "../requestOrigin.js";
import type { SecurityScheme } from "../server.js";
import type { OAuthConfig } from "./index.js";
import {
  clientPrefersInBandChallenge,
  evaluateSecuritySchemes,
  httpStatusForFailure,
  wwwAuthenticateHeader,
} from "./security-schemes.js";
import { createJwksVerifier } from "./verify.js";

export type SetupOAuthHooks = {
  acceptsAnonymous?: () => boolean;
  securitySchemesForTool?: (
    toolName: string,
  ) => { schemes: SecurityScheme[] | undefined } | undefined;
};

/** Mounts the well-known OAuth metadata and bearer auth on `/mcp`. */
export function setupOAuth(
  app: Express,
  config: OAuthConfig,
  hooks: SetupOAuthHooks = {},
): void {
  if (!config.verify?.issuer) {
    throw new Error("oauth.verify requires an `issuer`");
  }

  const { acceptsAnonymous, securitySchemesForTool } = hooks;
  const verifier = createJwksVerifier(config.verify);
  const bearer = (options: BearerAuthMiddlewareOptions): RequestHandler => {
    const required = requireBearerAuth(options);
    const optional = optionalBearerAuth(options);
    return (req, res, next) =>
      (acceptsAnonymous?.() ? optional : required)(req, res, next);
  };

  const perToolGate =
    (resourceMetadataUrl: (req: Request) => string): RequestHandler =>
    (req, res, next) => {
      const body = req.body as
        | {
            id?: string | number | null;
            method?: string;
            params?: { name?: string };
          }
        | undefined;
      if (body?.method !== "tools/call" || !securitySchemesForTool) {
        return next();
      }
      const tool = body.params?.name;
      const entry = tool ? securitySchemesForTool(tool) : undefined;
      if (!entry) {
        return next();
      }
      const failure = evaluateSecuritySchemes(
        entry.schemes,
        (req as Request & { auth?: AuthInfo }).auth,
      );
      if (!failure) {
        return next();
      }
      const challenge = wwwAuthenticateHeader(
        failure,
        resourceMetadataUrl(req),
      );
      if (clientPrefersInBandChallenge(req.get("user-agent"))) {
        res.json({
          jsonrpc: "2.0",
          id: body.id ?? null,
          result: {
            content: [{ type: "text", text: failure.description }],
            isError: true,
            _meta: { "mcp/www_authenticate": [challenge] },
          },
        });
        return;
      }
      res.set("WWW-Authenticate", challenge);
      res.status(httpStatusForFailure(failure)).json({
        error: failure.error,
        error_description: failure.description,
      });
    };

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
    const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(baseUrl);
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
        resourceMetadataUrl,
      }),
    );
    app.use(
      "/mcp",
      perToolGate(() => resourceMetadataUrl),
    );
    return;
  }

  // No baseUrl: resolve the resource origin per request from forwarded headers
  // (same precedence the framework uses for view serverUrl). Origin headers are
  // pathless, so the PRM path stays at root, matching the SDK's static layout.
  const resolveOrigin = (req: Request) =>
    new URL(resolveServerOrigin((key) => req.get(key)));
  const resourceMetadataUrl = (req: Request) =>
    getOAuthProtectedResourceMetadataUrl(resolveOrigin(req));

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
      resourceMetadataUrl: resourceMetadataUrl(req),
    })(req, res, next),
  );
  app.use("/mcp", perToolGate(resourceMetadataUrl));
}

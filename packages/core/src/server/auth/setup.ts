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
  type SchemeFailure,
  securitySchemesAllowAnonymous,
  wwwAuthenticateHeader,
} from "./security-schemes.js";
import { createJwksVerifier } from "./verify.js";

export type ResourceMetadataUrlResolver = (
  getHeader: (key: string) => string | undefined,
) => string;

/** Mounts the well-known OAuth metadata and bearer auth on `/mcp`. */
export function setupOAuth(
  app: Express,
  config: OAuthConfig,
  schemesByTool: Map<string, SecurityScheme[] | undefined>,
): ResourceMetadataUrlResolver {
  if (!config.verify?.issuer) {
    throw new Error("oauth.verify requires an `issuer`");
  }

  const acceptsAnonymous = () =>
    [...schemesByTool.values()].some(securitySchemesAllowAnonymous);
  const verifier = createJwksVerifier(config.verify);
  const bearer = (options: BearerAuthMiddlewareOptions): RequestHandler => {
    const required = requireBearerAuth(options);
    const optional = optionalBearerAuth(options);
    return (req, res, next) =>
      (acceptsAnonymous() ? optional : required)(req, res, next);
  };

  let resourceMetadataUrl: ResourceMetadataUrlResolver;

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
    const url = getOAuthProtectedResourceMetadataUrl(baseUrl);
    resourceMetadataUrl = () => url;
  } else {
    // No baseUrl: resolve the resource origin per request from forwarded headers
    // (same precedence the framework uses for view serverUrl). Origin headers are
    // pathless, so the PRM path stays at root, matching the SDK's static layout.
    const resolveOrigin = (getHeader: (key: string) => string | undefined) =>
      new URL(resolveServerOrigin(getHeader));
    app.use(
      "/.well-known/oauth-authorization-server",
      cors(),
      (_req, res) => void res.json(config.oauthMetadata),
    );
    app.use("/.well-known/oauth-protected-resource", cors(), (req, res) => {
      res.json({
        resource: resolveOrigin((key) => req.get(key)).href,
        authorization_servers: [config.oauthMetadata.issuer],
        scopes_supported: config.scopesSupported,
      });
    });
    resourceMetadataUrl = (getHeader) =>
      getOAuthProtectedResourceMetadataUrl(resolveOrigin(getHeader));
  }

  app.use("/mcp", (req, res, next) =>
    bearer({
      verifier,
      requiredScopes: config.requiredScopes,
      resourceMetadataUrl: resourceMetadataUrl((key) => req.get(key)),
    })(req, res, next),
  );

  app.use("/mcp", (req, res, next) => {
    type Call = {
      id?: string | number | null;
      method?: string;
      params?: { name?: string };
    };
    const body = req.body as Call | Call[] | undefined;
    const calls = Array.isArray(body) ? body : [body];
    const auth = (req as Request & { auth?: AuthInfo }).auth;
    let failure: SchemeFailure | undefined;
    for (const call of calls) {
      const tool = call?.params?.name;
      if (call?.method === "tools/call" && tool && schemesByTool.has(tool)) {
        failure = evaluateSecuritySchemes(schemesByTool.get(tool), auth);
        if (failure) {
          break;
        }
      }
    }
    if (!failure) {
      return next();
    }
    const challenge = wwwAuthenticateHeader(
      failure,
      resourceMetadataUrl((key) => req.get(key)),
    );
    if (clientPrefersInBandChallenge(req.get("user-agent"))) {
      if (Array.isArray(body)) {
        return next();
      }
      res.json({
        jsonrpc: "2.0",
        id: body?.id ?? null,
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
  });

  return resourceMetadataUrl;
}

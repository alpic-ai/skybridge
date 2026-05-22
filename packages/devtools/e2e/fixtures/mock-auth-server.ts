/**
 * Mock OAuth 2.1 Authorization Server for e2e tests.
 *
 * Mounts the full client-facing AS surface — DCR (RFC 7591), authorize
 * redirect (OAuth 2.1), PKCE-protected token exchange — plus the RFC 9728
 * Protected Resource Metadata and RFC 8414 Authorization Server Metadata
 * needed by the MCP SDK's discovery flow. State lives in in-memory Maps,
 * tokens never expire, the authorize endpoint immediately redirects back
 * with a code (no consent UI).
 *
 * Intended exclusively for the devtools e2e fixture. Not safe for any
 * other use.
 *
 * Why hand-rolled instead of `mcpAuthRouter`?
 * ─────────────────────────────────────────────────────────────────────
 * The MCP TypeScript SDK v1 ships `mcpAuthRouter` + `OAuthServerProvider`
 * — purpose-built for exactly this scenario (in-process mini-AS for
 * demos and tests). However v2 has removed both, per the v2 migration
 * notes:
 *
 *   "Authorization Server helpers (mcpAuthRouter, OAuthServerProvider,
 *    ProxyOAuthServerProvider, authenticateClient, ...) have been
 *    removed from the core SDK; new code should use a dedicated
 *    IdP/OAuth library."
 *   — modelcontextprotocol/typescript-sdk, docs/migration.md
 *
 * Building on top of `mcpAuthRouter` would land us on a deprecated code
 * path. The Resource Server pieces (`requireBearerAuth`,
 * `mcpAuthMetadataRouter`) are staying in v2, so the consumer in
 * `server.ts` continues to use those. Only the AS-side endpoints live
 * here.
 */

import crypto from "node:crypto";
import express, { type Router } from "express";
import { type AuthInfo, InvalidTokenError } from "skybridge/server";

// ─── Public surface ──────────────────────────────────────────────────────

export interface MockAuthServerOptions {
  /** Base URL of the fixture (e.g. `http://localhost:4102`). */
  serverUrl: string;
  /**
   * Tokens to accept on top of any dynamically issued ones. Used by tests
   * that pre-seed `localStorage` to bypass the OAuth flow entirely.
   */
  seedTokens?: Array<{ token: string; clientId: string; scopes?: string[] }>;
}

export interface MockAuthServer {
  /**
   * Express router exposing the AS endpoints + well-known metadata.
   * Mount on the MCP server before `requireBearerAuth("/mcp", …)`.
   */
  readonly router: Router;
  /**
   * `verifyAccessToken` implementation for
   * `requireBearerAuth({ verifier: { verifyAccessToken } })`.
   */
  verifyAccessToken(token: string): Promise<AuthInfo>;
}

export function createMockAuthServer(
  options: MockAuthServerOptions,
): MockAuthServer {
  const stores = createStores(options.seedTokens);
  const router = buildRouter(options.serverUrl, stores);

  return {
    router,
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      const info = stores.tokens.get(token);
      if (!info) {
        throw new InvalidTokenError("invalid token");
      }
      return {
        token,
        clientId: info.clientId,
        scopes: info.scopes,
        expiresAt: info.expiresAt,
      };
    },
  };
}

// ─── In-memory state ─────────────────────────────────────────────────────

interface ClientInfo {
  client_id: string;
  redirect_uris: string[];
  [key: string]: unknown;
}

interface AuthCodeInfo {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scope?: string;
  resource?: string;
}

interface TokenInfo {
  clientId: string;
  scopes: string[];
  expiresAt: number;
}

interface RefreshTokenInfo {
  clientId: string;
  scopes: string[];
}

interface Stores {
  clients: Map<string, ClientInfo>;
  codes: Map<string, AuthCodeInfo>;
  tokens: Map<string, TokenInfo>;
  refreshTokens: Map<string, RefreshTokenInfo>;
}

function createStores(seedTokens: MockAuthServerOptions["seedTokens"]): Stores {
  const tokens = new Map<string, TokenInfo>();
  const tokenTtlSeconds = 3600;
  const expiresAt = Math.floor(Date.now() / 1000) + tokenTtlSeconds;
  for (const seed of seedTokens ?? []) {
    tokens.set(seed.token, {
      clientId: seed.clientId,
      scopes: seed.scopes ?? [],
      expiresAt,
    });
  }
  return {
    clients: new Map(),
    codes: new Map(),
    tokens,
    refreshTokens: new Map(),
  };
}

// ─── PKCE ────────────────────────────────────────────────────────────────

function verifyPkceS256(verifier: string, challenge: string): boolean {
  const computed = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  if (computed.length !== challenge.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(challenge));
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function randomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function oauthError(
  res: express.Response,
  status: number,
  error: string,
  description: string,
): void {
  res.status(status).json({ error, error_description: description });
}

// ─── Router ──────────────────────────────────────────────────────────────

function buildRouter(serverUrl: string, stores: Stores): Router {
  const router = express.Router();

  router.get("/.well-known/oauth-protected-resource/mcp", (_req, res) => {
    res.json({
      resource: `${serverUrl}/mcp`,
      authorization_servers: [serverUrl],
    });
  });

  router.get("/.well-known/oauth-authorization-server", (_req, res) => {
    res.json({
      issuer: serverUrl,
      authorization_endpoint: `${serverUrl}/authorize`,
      token_endpoint: `${serverUrl}/token`,
      registration_endpoint: `${serverUrl}/register`,
      response_types_supported: ["code"],
      response_modes_supported: ["query"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      authorization_response_iss_parameter_supported: true,
    });
  });

  router.post("/register", express.json(), (req, res) => {
    const body = req.body as Partial<ClientInfo> | undefined;
    if (!body || !Array.isArray(body.redirect_uris)) {
      oauthError(
        res,
        400,
        "invalid_client_metadata",
        "redirect_uris is required",
      );
      return;
    }
    const client: ClientInfo = {
      ...body,
      client_id: crypto.randomUUID(),
      redirect_uris: body.redirect_uris,
    };
    stores.clients.set(client.client_id, client);
    res
      .status(201)
      .json({ ...client, client_id_issued_at: Math.floor(Date.now() / 1000) });
  });

  router.get("/authorize", (req, res) => {
    const {
      response_type,
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method,
      state,
      scope,
      resource,
    } = req.query as Record<string, string | undefined>;

    if (response_type !== "code") {
      oauthError(
        res,
        400,
        "unsupported_response_type",
        "response_type must be 'code'",
      );
      return;
    }
    if (!client_id) {
      oauthError(res, 400, "invalid_request", "client_id is required");
      return;
    }
    const client = stores.clients.get(client_id);
    if (!client) {
      oauthError(res, 400, "invalid_client", "unknown client_id");
      return;
    }
    if (!redirect_uri || !client.redirect_uris.includes(redirect_uri)) {
      oauthError(res, 400, "invalid_request", "redirect_uri not registered");
      return;
    }
    if (!code_challenge || code_challenge_method !== "S256") {
      oauthError(res, 400, "invalid_request", "PKCE S256 is required");
      return;
    }

    const code = crypto.randomUUID();
    stores.codes.set(code, {
      clientId: client_id,
      redirectUri: redirect_uri,
      codeChallenge: code_challenge,
      scope,
      resource,
    });

    const callback = new URL(redirect_uri);
    callback.searchParams.set("code", code);
    if (state) {
      callback.searchParams.set("state", state);
    }
    // RFC 9207 — strongly recommended by the MCP spec.
    callback.searchParams.set("iss", serverUrl);
    res.redirect(302, callback.toString());
  });

  router.post("/token", express.urlencoded({ extended: false }), (req, res) => {
    const body = req.body as Record<string, string | undefined>;
    switch (body.grant_type) {
      case "authorization_code":
        handleAuthorizationCodeGrant(body, res, stores);
        return;
      case "refresh_token":
        handleRefreshTokenGrant(body, res, stores);
        return;
      default:
        oauthError(
          res,
          400,
          "unsupported_grant_type",
          `unsupported grant_type: ${body.grant_type}`,
        );
    }
  });

  return router;
}

// ─── Grant handlers ──────────────────────────────────────────────────────

function handleAuthorizationCodeGrant(
  body: Record<string, string | undefined>,
  res: express.Response,
  stores: Stores,
): void {
  const { code, code_verifier, redirect_uri, client_id } = body;
  if (!code || !code_verifier || !client_id) {
    oauthError(res, 400, "invalid_request", "missing required parameters");
    return;
  }
  const entry = stores.codes.get(code);
  if (!entry) {
    oauthError(res, 400, "invalid_grant", "unknown authorization code");
    return;
  }
  // Codes are one-shot regardless of outcome — prevents replay.
  stores.codes.delete(code);

  if (entry.clientId !== client_id) {
    oauthError(res, 400, "invalid_grant", "client_id mismatch");
    return;
  }
  if (entry.redirectUri !== redirect_uri) {
    oauthError(res, 400, "invalid_grant", "redirect_uri mismatch");
    return;
  }
  if (!verifyPkceS256(code_verifier, entry.codeChallenge)) {
    oauthError(res, 400, "invalid_grant", "PKCE verification failed");
    return;
  }

  const scopes = entry.scope ? entry.scope.split(" ") : [];
  const accessToken = randomToken();
  const refreshToken = randomToken();
  const tokenTtlSeconds = 3600;

  stores.tokens.set(accessToken, {
    clientId: entry.clientId,
    scopes,
    expiresAt: Math.floor(Date.now() / 1000) + tokenTtlSeconds,
  });
  stores.refreshTokens.set(refreshToken, {
    clientId: entry.clientId,
    scopes,
  });

  res.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: tokenTtlSeconds,
    refresh_token: refreshToken,
    ...(entry.scope ? { scope: entry.scope } : {}),
  });
}

function handleRefreshTokenGrant(
  body: Record<string, string | undefined>,
  res: express.Response,
  stores: Stores,
): void {
  const { refresh_token, client_id } = body;
  if (!refresh_token || !client_id) {
    oauthError(res, 400, "invalid_request", "missing required parameters");
    return;
  }
  const entry = stores.refreshTokens.get(refresh_token);
  if (!entry || entry.clientId !== client_id) {
    oauthError(res, 400, "invalid_grant", "invalid refresh_token");
    return;
  }

  const accessToken = randomToken();
  const tokenTtlSeconds = 3600;
  stores.tokens.set(accessToken, {
    clientId: entry.clientId,
    scopes: entry.scopes,
    expiresAt: Math.floor(Date.now() / 1000) + tokenTtlSeconds,
  });

  res.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: tokenTtlSeconds,
    // No rotation — return the same refresh_token.
    refresh_token,
  });
}

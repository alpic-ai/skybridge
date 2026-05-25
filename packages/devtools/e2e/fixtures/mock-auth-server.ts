/**
 * Mock OAuth 2.1 Authorization Server for the devtools e2e fixture.
 * Implements DCR (RFC 7591), PKCE-S256 /authorize, and the authorization_code
 * /token grant — enough to drive the MCP SDK's discovery + token flow.
 * State is in-memory, tokens never refresh, /authorize auto-approves.
 *
 * Why hand-rolled instead of `mcpAuthRouter`? The MCP TS SDK v2 removed the
 * AS helpers (mcpAuthRouter, OAuthServerProvider, …) per its migration notes;
 * building on them would land on a deprecated path. The Resource Server
 * pieces (`requireBearerAuth`) are staying, so the consumer in `server.ts`
 * keeps using those — only the AS-side endpoints live here.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express, { type Router } from "express";
import { type AuthInfo, InvalidTokenError } from "skybridge/server";

export interface MockAuthServerOptions {
  /** Base URL of the fixture (e.g. `http://localhost:4102`). */
  serverUrl: string;
  /**
   * Tokens to accept on top of any dynamically issued ones. Used by tests
   * that pre-seed `localStorage` to bypass the OAuth flow entirely.
   */
  seedTokens?: Array<{ token: string; clientId: string; scopes?: string[] }>;
  /**
   * Optional path to persist DCR client registrations across fixture
   * restarts. Without this, an interactive dev workflow that survives the
   * fixture process (the browser holds a `client_id` in localStorage) hits
   * `invalid_client` when the fixture restarts. Auth codes and tokens stay
   * in-memory — only the client registry is persisted.
   */
  clientsFile?: string;
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
  const stores = createStores(options.seedTokens, options.clientsFile);
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

interface Stores {
  clients: Map<string, ClientInfo>;
  codes: Map<string, AuthCodeInfo>;
  tokens: Map<string, TokenInfo>;
  persistClients?: () => void;
}

const TOKEN_TTL_SECONDS = 3600;

function createStores(
  seedTokens: MockAuthServerOptions["seedTokens"],
  clientsFile: string | undefined,
): Stores {
  const tokens = new Map<string, TokenInfo>();
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  for (const seed of seedTokens ?? []) {
    tokens.set(seed.token, {
      clientId: seed.clientId,
      scopes: seed.scopes ?? [],
      expiresAt,
    });
  }

  const clients = new Map<string, ClientInfo>();
  let persistClients: (() => void) | undefined;
  if (clientsFile) {
    if (fs.existsSync(clientsFile)) {
      try {
        const raw = fs.readFileSync(clientsFile, "utf8");
        for (const entry of JSON.parse(raw) as ClientInfo[]) {
          clients.set(entry.client_id, entry);
        }
      } catch {
        // Malformed file — start fresh; next /register rewrites it.
      }
    }
    persistClients = () => {
      fs.mkdirSync(path.dirname(clientsFile), { recursive: true });
      fs.writeFileSync(
        clientsFile,
        JSON.stringify(Array.from(clients.values()), null, 2),
      );
    };
  }

  return { clients, codes: new Map(), tokens, persistClients };
}

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
      grant_types_supported: ["authorization_code"],
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
    stores.persistClients?.();
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
    if (body.grant_type !== "authorization_code") {
      oauthError(
        res,
        400,
        "unsupported_grant_type",
        `unsupported grant_type: ${body.grant_type}`,
      );
      return;
    }
    handleAuthorizationCodeGrant(body, res, stores);
  });

  return router;
}

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

  stores.tokens.set(accessToken, {
    clientId: entry.clientId,
    scopes,
    expiresAt: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  });

  res.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: TOKEN_TTL_SECONDS,
    ...(entry.scope ? { scope: entry.scope } : {}),
  });
}

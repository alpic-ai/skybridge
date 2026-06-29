# OAuth Authentication

Enable user authentication so tools can access user-specific data.

## How it works

1. Pass an `oauth` config as the third `McpServer` argument
2. Skybridge auto-mounts the OAuth discovery endpoints (`/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`) and Bearer JWT verification on `/mcp`
3. The host reads the metadata, walks the user through OAuth, refreshes tokens, and calls `/mcp` with `Authorization: Bearer <token>`
4. Unauthenticated/invalid requests **to `/mcp`** get HTTP 401 before any tool handler runs. The `oauth` field guards `/mcp` only — any custom route you mount yourself is unprotected; gate it explicitly (see [Manual wiring](#manual-wiring))
5. Tool handlers read user identity from `extra.authInfo`

## Which path?

The `oauth` field handles all-or-nothing auth; mixed auth or an unsupported IdP needs manual wiring.

```
All tools require sign-in?
├─ No — some public, some gated ──────────────────→ Manual wiring
└─ Yes
   ├─ A branded provider fits your IdP ────────────→ Pick a provider
   │     (WorkOS · Auth0 · Clerk · Stytch · Descope)
   ├─ No helper, but IdP has OAuth discovery + JWKS → customProvider
   └─ No discovery doc, or opaque tokens ───────────→ Manual wiring
```

- [Pick a provider](#1-pick-a-provider) · [`customProvider`](#2-any-other-idp--customprovider) · [Manual wiring](#manual-wiring)

## 1. Pick a provider

The branded providers discover the IdP's OAuth metadata and build the whole config. All require **Dynamic Client Registration (DCR)** enabled in the provider dashboard, and return a `Promise` — `await` it.

```typescript
// src/server.ts
import { McpServer, descopeProvider } from "skybridge/server";

const server = new McpServer(
  { name: "my-app", version: "0.0.1" },
  { capabilities: {} },
  {
    oauth: await descopeProvider({
      url: env.DESCOPE_MCP_SERVER_URL, // MCP Server Discovery URL (Issuer)
    }),
  },
);
```

| Provider | Import | Required options | Notes |
|---|---|---|---|
| WorkOS AuthKit | `workosProvider` | `domain`, `audience` | `domain` = AuthKit domain; `audience` = Resource Indicator (this server's URL). DCR under Connect → Configuration. |
| Auth0 | `auth0Provider` | `domain`, `audience`, `serverUrl` | `audience` = API Identifier. Runs skybridge-as-AS (`serverUrl`) and bakes `?audience=` into `/authorize`. Set `scopes` to what the app needs (e.g. `["openid","profile","email"]`) — Auth0 won't grant a DCR client its full OIDC set. |
| Clerk | `clerkProvider` | `domain` | `domain` = Frontend API URL. No `audience` (Clerk tokens carry no `aud`). The OAuth app must issue **JWT** access tokens, not opaque. |
| Stytch | `stytchProvider` | `domain`, `audience` | `domain` = project domain; `audience` = Stytch Project ID. |
| Descope | `descopeProvider` | `url` | `url` = MCP Server Discovery URL (Issuer). `audience` defaults to the Project ID derived from the URL. DCR disabled + Alpic DCR proxy → use `customProvider` with `serverUrl` (see `examples/auth-descope-alpic`). |

Working servers for each: `examples/auth-workos`, `auth-auth0`, `auth-clerk`, `auth-stytch`, `auth-descope`.

## 2. Any other IdP — `customProvider`

For an IdP without a branded helper, point `customProvider` at its issuer; it reads the OAuth discovery document (requires a `jwks_uri`):

```typescript
import { customProvider } from "skybridge/server";

oauth: await customProvider({
  issuer: "https://your-idp.com",
  audience: "my-api",            // omit only if the IdP binds no aud
  scopes: ["openid", "email", "profile"],
  // serverUrl: env.SERVER_URL,  // skybridge-as-AS: needed when skybridge must
                                 // sit in the auth path (e.g. Alpic DCR proxy)
}),
```

`customProvider` also accepts `baseUrl` (this server's public URL; inferred from request headers when omitted), `requiredScopes` (server-wide floor), and `metadataOverrides`.

## 3. Read auth in handlers

`extra.authInfo` carries the verified token. Its `extra.subject` holds the `sub` claim; all other JWT claims (e.g. `email`) are spread alongside it.

```typescript
import type { AuthInfo } from "skybridge/server";

server.registerTool(
  { name: "get-orders", description: "Get user orders" },
  async (_input, extra) => {
    const auth = extra.authInfo as AuthInfo;
    const subject = auth.extra?.subject as string;
    const orders = await fetchOrders(subject);
    return {
      structuredContent: { orders },
      content: [{ type: "text", text: `Found ${orders.length} orders` }],
    };
  },
);
```

## Manual wiring

Reach for this when the `oauth` field can't express your setup: **mixed auth** (some tools public, some gated), or an **IdP with no OAuth discovery / opaque tokens** (you verify by introspection instead of JWKS). The same primitives are exported from `skybridge/server`.

### Write a verifier

`verifyAccessToken` resolves with `AuthInfo` for a good token, or throws `InvalidTokenError`. For a JWT IdP, verify against its JWKS:

```typescript
import { type AuthInfo, InvalidTokenError } from "skybridge/server";
import * as jose from "jose";

const jwks = jose.createRemoteJWKSet(new URL("https://your-idp.com/.well-known/jwks.json"));

export async function verifyAccessToken(token: string): Promise<AuthInfo> {
  try {
    const { payload } = await jose.jwtVerify(token, jwks, { issuer: "https://your-idp.com" });
    return {
      token,
      clientId: (payload.client_id ?? payload.azp ?? "") as string,
      scopes: typeof payload.scope === "string" ? payload.scope.split(" ") : [],
      expiresAt: payload.exp, // required: requireBearerAuth rejects tokens with no expiry
      extra: { subject: payload.sub },
    };
  } catch (err) {
    throw new InvalidTokenError(err instanceof Error ? err.message : String(err));
  }
}
```

### Mount metadata + enforcement

`mcpAuthMetadataRouter` serves the well-known endpoints. `requireBearerAuth` rejects every unauthenticated request; `optionalBearerAuth` lets unauthenticated requests through (validating a token only when one is sent) — this is the mixed-auth path.

```typescript
import {
  mcpAuthMetadataRouter,
  optionalBearerAuth,
} from "skybridge/server";
import { verifyAccessToken } from "./auth.js";

const server = new McpServer({ name: "my-app", version: "0.0.1" }, { capabilities: {} })
  .use(
    mcpAuthMetadataRouter({
      oauthMetadata: {
        issuer: "https://your-idp.com",
        authorization_endpoint: "https://your-idp.com/authorize",
        token_endpoint: "https://your-idp.com/token",
        response_types_supported: ["code"],
        code_challenge_methods_supported: ["S256"],
      },
      resourceServerUrl: new URL(process.env.SERVER_URL),
    }),
  )
  .use("/mcp", optionalBearerAuth({ verifier: { verifyAccessToken } }));
```

Then declare each tool's requirement with `securitySchemes` (`{ type: "noauth" }` for public, `{ type: "oauth2", scopes? }` for gated):

```typescript
server.registerTool(
  { name: "public-search", description: "...", securitySchemes: [{ type: "noauth" }] },
  handler,
);
server.registerTool(
  { name: "get-orders", description: "...", securitySchemes: [{ type: "oauth2" }] },
  async (_input, extra) => {
    // securitySchemes is advertised to the host only — NOT enforced at runtime.
    // optionalBearerAuth lets token-less requests through, so a gated handler
    // MUST verify authInfo itself.
    if (!extra.authInfo) throw new Error("Unauthorized");
    // ...
  },
);
```

For an all-or-nothing manual server, swap `optionalBearerAuth` for `requireBearerAuth` and drop the per-tool `securitySchemes` — then `authInfo` is guaranteed in every handler.

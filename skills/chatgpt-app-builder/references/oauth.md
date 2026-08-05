# OAuth Authentication

Enable user authentication so tools can access user-specific data.

## How it works

1. Pass an `oauth` config as the third `McpServer` argument
2. Skybridge auto-mounts the OAuth discovery endpoints (`/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`) and Bearer JWT verification on `/mcp`
3. The host reads the metadata, walks the user through OAuth, refreshes tokens, and calls `/mcp` with `Authorization: Bearer <token>`
4. By default every tool requires sign-in: unauthenticated/invalid requests **to `/mcp`** get HTTP 401 before any tool handler runs
5. Tool handlers read user identity from `extra.authInfo`

The `oauth` field guards `/mcp` and nothing else. A route you mount yourself outside `/mcp` is unauthenticated — gate it with `requireBearerAuth`, your own verifier, and the same `requiredScopes` the `oauth` config sets, or it accepts under-scoped tokens `/mcp` rejects. Note that Alpic Cloud only routes traffic to `/mcp` (custom paths work locally and self-hosted).

## Which path?

The `oauth` field covers all-or-nothing **and** mixed auth. Manual wiring is only for an IdP whose tokens the framework can't verify.

```
Does the IdP publish an OAuth discovery document with a jwks_uri?
├─ Yes
│  ├─ A branded provider fits your IdP ─────────→ Pick a provider
│  │    (WorkOS · Auth0 · Clerk · Stytch · Descope · Authplane)
│  └─ No helper for it ──────────────────────────→ customProvider
│  (either way, if some tools stay public ──────→ add per-tool `auth`)
└─ No ───────────────────────────────────────────→ Manual wiring
      (no discovery doc, or opaque tokens you
       verify by introspection — a JWKS alone
       isn't enough: customProvider reads the
       jwks_uri *out of* the discovery document)
```

- [Pick a provider](#1-pick-a-provider) · [`customProvider`](#2-any-other-idp--customprovider) · [Per-tool auth](#4-mixed-auth-per-tool-auth) · [Manual wiring](#manual-wiring)

## 1. Pick a provider

The branded providers discover the IdP's OAuth metadata and build the whole config. All return a `Promise` — `await` it. Most need **Dynamic Client Registration (DCR)** enabled on the IdP side (Authplane has it natively; Descope without DCR goes through the Alpic proxy).

The table below covers what goes in the code. For the dashboard steps that produce those values, send the user to `docs/guides/auth-providers.mdx` — provider UIs change, and this file isn't the source of truth for them.

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
| WorkOS AuthKit | `workosProvider` | `domain`, `audience` | `domain` = AuthKit domain; `audience` = Resource Indicator (this server's URL). |
| Auth0 | `auth0Provider` | `domain`, `audience`, `serverUrl` | `audience` = API Identifier. Runs skybridge-as-AS (`serverUrl`) and bakes `?audience=` into `/authorize`. Set `scopes` to what the app needs (e.g. `["openid","profile","email"]`) — Auth0 won't grant a DCR client its full OIDC set. |
| Clerk | `clerkProvider` | `domain` | `domain` = Frontend API URL. No `audience` (Clerk tokens carry no `aud`). Verification only works if the OAuth app issues **JWT** access tokens — opaque tokens fail. |
| Stytch | `stytchProvider` | `domain`, `audience` | `domain` = project domain; `audience` = Stytch Project ID. |
| Descope | `descopeProvider` | `url` | `url` = MCP Server Discovery URL (Issuer). `audience` defaults to the Project ID derived from the URL. DCR disabled + Alpic DCR proxy → use `customProvider` with `serverUrl` (see `examples/auth-descope-alpic`). |
| Authplane | `authplaneProvider` | `issuer`, `resource` | `resource` = this server's public URL, and it also supplies the expected `aud` (RFC 8707). Pass it exactly as Authplane advertises it — the provider throws if URL normalization would rewrite it (bare origin, uppercase host, explicit default port). |

Working servers for each: `examples/auth-workos`, `auth-auth0`, `auth-clerk`, `auth-stytch`, `auth-descope`, `auth-authplane`.

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

`customProvider` also accepts `baseUrl` (this server's public URL; inferred from request headers when omitted), `requiredScopes` (server-wide floor), `metadataOverrides`, and `authorizationServer` (advertise a different AS than the discovery issuer — `serverUrl` wins if both are set).

## 3. Read auth in handlers

`extra.authInfo` carries the verified token. Its `extra.subject` holds the `sub` claim; all other JWT claims are spread alongside it, typed from the claims the provider documents, so no cast is needed.

```typescript
server.registerTool(
  { name: "get-orders", description: "Get user orders" },
  async (_input, extra) => {
    const orders = await fetchOrders(extra.authInfo?.extra?.subject);
    return {
      structuredContent: { orders },
      content: [{ type: "text", text: `Found ${orders.length} orders` }],
    };
  },
);
```

For a claim the provider does not ship by default, name it on the provider: `workosProvider<{ email?: string }>({ ... })`. No provider puts `email` in an access token unless a JWT template or claims action adds it.

## 4. Mixed auth: per-tool `auth`

With an `oauth` provider set, each tool declares its own requirement. Omit `auth` for the secure default (sign-in required, no specific scope).

```typescript
server
  .registerTool(
    {
      name: "browse-catalog",
      description: "Browse the public catalog",
      auth: { allowsAnonymous: true }, // callable signed out; token still read when present
    },
    (_input, extra) => ({ ...(extra.authInfo ? greet(extra.authInfo) : guest()) }),
  )
  .registerTool(
    { name: "checkout", description: "Place an order", auth: { scopes: ["checkout"] } },
    handler,
  );
```

Skybridge enforces this before the handler runs: each `tools/call` is checked against the calling tool's declaration — missing token → 401 `invalid_token`, missing scope → 403 `insufficient_scope` (a non-batched ChatGPT request gets the equivalent in-band `mcp/www_authenticate` challenge instead of the transport status). So a gated handler can rely on `extra.authInfo` being present.

⚠️ **One anonymous tool unlocks every non-`tools/call` method.** Declaring `allowsAnonymous` anywhere switches the whole `/mcp` route to optional Bearer, and only `tools/call` is checked per tool. So `initialize`, `tools/list`, `prompts/*` and `resources/read` — **including your view resources** — become reachable with no token at all. In a mixed server, never put user-specific data in a view resource or a prompt; return it from a gated tool's response instead.

`auth` compiles down to SEP-1488 `securitySchemes` advertised on the tool descriptor: `{ scopes }` becomes `[{ type: "oauth2", scopes }]`, and `allowsAnonymous` emits **both** `[{ type: "noauth" }, { type: "oauth2" }]`. Setting `securitySchemes` by hand is the low-level escape hatch — it disables the `auth` shorthand for that tool (they're mutually exclusive) and skips no enforcement, but you own the mapping.

Requiring sign-in (`auth: { scopes }`, or `auth: {}`) throws at registration when the server has no `oauth` provider. `auth: { allowsAnonymous: true }` is accepted either way, but without a provider it's silently dropped and no `noauth` scheme is advertised.

Working server: `examples/auth-descope-mixed`.

## Manual wiring

Only needed when the framework can't verify the IdP's tokens: **no OAuth discovery document, or opaque tokens** (you verify by introspection instead of JWKS). Mixed auth does *not* require this — see [per-tool `auth`](#4-mixed-auth-per-tool-auth). The primitives are exported from `skybridge/server`.

### Write a verifier

`verifyAccessToken` resolves with `AuthInfo` for a good token, or throws `InvalidTokenError`. For a JWT IdP, verify against its JWKS:

```typescript
import { type AuthInfo, InvalidTokenError } from "skybridge/server";
import * as jose from "jose";

const jwks = jose.createRemoteJWKSet(new URL("https://your-idp.com/.well-known/jwks.json"));

export async function verifyAccessToken(token: string): Promise<AuthInfo> {
  try {
    const { payload } = await jose.jwtVerify(token, jwks, {
      issuer: "https://your-idp.com",
      audience: "my-api", // omit only if the IdP binds no aud
    });
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

`mcpAuthMetadataRouter` serves the well-known endpoints. `requireBearerAuth` rejects every unauthenticated request; `optionalBearerAuth` lets unauthenticated requests through, validating a token only when one is sent.

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

Without an `oauth` provider the `auth` shorthand is unavailable, so declare each tool's requirement with `securitySchemes` (`{ type: "noauth" }` for public, `{ type: "oauth2", scopes? }` for gated):

```typescript
server.registerTool(
  { name: "public-search", description: "...", securitySchemes: [{ type: "noauth" }] },
  handler,
);
server.registerTool(
  { name: "get-orders", description: "...", securitySchemes: [{ type: "oauth2", scopes: ["orders:read"] }] },
  async (_input, extra) => {
    // No `oauth` provider means no framework enforcement: securitySchemes is
    // advertised to the host only, and optionalBearerAuth lets token-less
    // requests through. A gated handler MUST do both checks itself.
    if (!extra.authInfo) return signInChallenge(["orders:read"]);
    if (!extra.authInfo.scopes.includes("orders:read")) {
      return insufficientScope(["orders:read"]);
    }
    // ...
  },
);
```

Declaring `scopes` in `securitySchemes` enforces nothing on its own — the framework only acts on it when an `oauth` provider is set. `optionalBearerAuth` verifies the token's signature, not what it's allowed to do, so without the `scopes.includes` check every signed-in user passes a scope-gated tool.

### Reject from inside a handler

Don't `throw` on missing auth. The handler runs after the transport, so it can't send a 401, and a thrown error reaches the host as an opaque tool failure — it never triggers the sign-in flow. Return the in-band challenge instead: `isError` plus a `mcp/www_authenticate` header array in `_meta`, pointing at your protected-resource metadata. This is the shape the `oauth` field emits for ChatGPT, and what ChatGPT acts on.

```typescript
const challenge = (
  error: "invalid_token" | "insufficient_scope",
  text: string,
  scopes: string[],
) => ({
  isError: true,
  content: [{ type: "text" as const, text }],
  _meta: {
    "mcp/www_authenticate": [
      `Bearer error="${error}", error_description="${text}", scope="${scopes.join(" ")}", ` +
        `resource_metadata="${process.env.SERVER_URL}/.well-known/oauth-protected-resource"`,
    ],
  },
});

const signInChallenge = (scopes: string[]) =>
  challenge("invalid_token", "Sign in to use this tool.", scopes);
const insufficientScope = (scopes: string[]) =>
  challenge("insufficient_scope", "Missing required scope for this tool.", scopes);
```

For an all-or-nothing manual server, swap `optionalBearerAuth` for `requireBearerAuth` and drop the per-tool `securitySchemes` — then `authInfo` is guaranteed in every handler and no challenge is needed.

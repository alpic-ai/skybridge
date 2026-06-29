# OAuth Authentication

Enable user authentication so tools can access user-specific data.

## How it works

1. Pass an `oauth` config as the third `McpServer` argument
2. Skybridge auto-mounts the OAuth discovery endpoints (`/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`) and Bearer JWT verification on `/mcp`
3. The host reads the metadata, walks the user through OAuth, refreshes tokens, and calls `/mcp` with `Authorization: Bearer <token>`
4. Unauthenticated/invalid requests get HTTP 401 before any tool handler runs
5. Tool handlers read user identity from `extra.authInfo`

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

## Manual wiring (escape hatch)

The `oauth` field replaces hand-mounting `mcpAuthMetadataRouter` + `requireBearerAuth`. Those primitives are still exported from `skybridge/server` if you need full control, but prefer a provider.

# OAuth Authentication

Enable user authentication so tools can access user-specific data.

## How it works

1. MCP server exposes OAuth discovery endpoints
2. Host reads them, walks the user through OAuth, refreshes tokens
3. Host calls `/mcp` with `Authorization: Bearer <token>`
4. `requireBearerAuth` middleware verifies the token and rejects with HTTP 401 if invalid — tool handlers never run unauthenticated
5. Tool handlers read user identity from `extra.authInfo`

## 1. Discovery endpoints

Mount OAuth metadata so MCP clients can discover the authorization server:

```typescript
// src/server.ts
import { mcpAuthMetadataRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { McpServer } from "skybridge/server";

const server = new McpServer(
  { name: "my-app", version: "0.0.1" },
  { capabilities: {} },
).use(
  mcpAuthMetadataRouter({
    oauthMetadata: {
      issuer: "https://your-oauth-provider.com",
      authorization_endpoint: "https://your-oauth-provider.com/oauth2/authorize",
      token_endpoint: "https://your-oauth-provider.com/oauth2/token",
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
    },
    // SERVER_URL: this server's public URL (localhost:3000, Alpic tunnel, or prod)
    resourceServerUrl: new URL(process.env.SERVER_URL),
  }),
);
```

This serves `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource`.

## 2. Write a token verifier

`requireBearerAuth` takes a `verifier` with `verifyAccessToken(token): Promise<AuthInfo>`. Verify the provider's JWT against its JWKS:

⚠️ Fetch your provider's docs for the exact JWKS URL and issuer.

```typescript
// src/auth.ts
import { InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import * as jose from "jose";

const jwks = jose.createRemoteJWKSet(
  new URL("https://your-oauth-provider.com/oauth2/jwks"),
);

export async function verifyAccessToken(token: string): Promise<AuthInfo> {
  const { payload } = await jose.jwtVerify(token, jwks, {
    issuer: "https://your-oauth-provider.com",
  });

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new InvalidTokenError("missing sub claim");
  }

  return {
    token,
    clientId: (payload.client_id ?? payload.azp ?? "") as string,
    scopes: typeof payload.scope === "string" ? payload.scope.split(" ") : [],
    expiresAt: payload.exp,
    extra: { sub: payload.sub },
  };
}
```

## 3. Enforce auth on /mcp

```typescript
// src/server.ts (continued)
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { verifyAccessToken } from "./auth.js";

server.use(
  "/mcp",
  requireBearerAuth({
    verifier: { verifyAccessToken },
    requiredScopes: ["openid", "email", "profile"], // optional
  }),
);
```

Unauthenticated requests get HTTP 401 before any tool handler runs.

## 4. Read auth in handlers

```typescript
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

server.registerTool(
  {
    name: "get-orders",
    description: "Get user orders",
  },
  async (_input, extra) => {
    const auth = extra.authInfo as AuthInfo;
    const orders = await fetchOrders(auth.extra?.sub as string);
    return {
      structuredContent: { orders },
      content: [{ type: "text", text: `Found ${orders.length} orders` }],
    };
  },
);
```

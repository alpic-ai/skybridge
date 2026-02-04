# OAuth Authentication

Enable user authentication so tools can access user-specific data.

## How it works

1. MCP server exposes OAuth discovery endpoints
2. Host reads them, handles OAuth flow with user and token refresh
3. Host sends access token in `Authorization: Bearer <token>` header
4. Tool handlers validate token and get user info

## 1. Discovery Endpoints

Serve two JSON endpoints so the LLM host knows where to authenticate users:

```typescript
// index.ts
import { mcpAuthMetadataRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";

app.use(
  mcpAuthMetadataRouter({
    oauthMetadata: {
      issuer: "https://your-oauth-provider.com",
      authorization_endpoint: "https://your-oauth-provider.com/oauth2/authorize",
      token_endpoint: "https://your-oauth-provider.com/oauth2/token",
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
    },
    // MCP_SERVER_URL: the server's public URL (localhost:3000, ngrok, or prod)
    resourceServerUrl: new URL(process.env.MCP_SERVER_URL),
  }),
);
```

This creates:
- `/.well-known/oauth-authorization-server` — where to send users to login
- `/.well-known/oauth-protected-resource` — declares this server requires auth

## 2. Validate Token in Handlers

Access token via `extra.requestInfo.headers.authorization`. Most providers use one of these patterns.

⚠️ **Fetch provider's docs for exact URLs — JWKS paths and issuer formats vary**.

**Pattern A: JWT + JWKS**
```typescript
// auth.ts
import * as jose from "jose";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

type Extra = RequestHandlerExtra<any, any>;

const jwks = jose.createRemoteJWKSet(
  new URL("https://your-oauth-provider.com/oauth2/jwks")
);

export async function getAuth(extra: Extra): Promise<{ userId: string } | null> {
  const authHeader = extra.requestInfo?.headers?.authorization;
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();

  try {
    const { payload } = await jose.jwtVerify(token, jwks, {
      issuer: "https://your-oauth-provider.com",
    });
    return { userId: payload.sub as string };
  } catch {
    return null;
  }
}
```

**Pattern B: Userinfo endpoint (opaque tokens)**
```typescript
// auth.ts
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

type Extra = RequestHandlerExtra<any, any>;

export async function getAuth(extra: Extra): Promise<{ userId: string } | null> {
  const authHeader = extra.requestInfo?.headers?.authorization;
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();

  const res = await fetch("https://your-oauth-provider.com/oauth2/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  const user = await res.json();
  return { userId: user.sub };
}
```

## 3. Use in Tool Handlers

```typescript
server.registerTool(
  "get-orders",
  { description: "Get user orders", inputSchema: {} },
  async (input, extra) => {
    const auth = await getAuth(extra);

    if (!auth) {
      return {
        content: [{ type: "text", text: "Please sign in to view orders." }],
        isError: true,
        _meta: {
          "mcp/www_authenticate": [
            `Bearer resource_metadata="${process.env.MCP_SERVER_URL}/.well-known/oauth-protected-resource"`,
          ],
        },
      };
    }

    const orders = await fetchOrders(auth.userId);
    return {
      structuredContent: { orders },
      content: [{ type: "text", text: `Found ${orders.length} orders` }],
    };
  }
);
```

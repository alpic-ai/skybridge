# Auth Example — Auth0

An example MCP app built with [Skybridge](https://docs.skybridge.tech/home): a personalized coffee shop finder demonstrating full OAuth authentication with [Auth0](https://auth0.com/).

> **Important**: Auth0 does not support [Dynamic Client Registration (DCR)](https://datatracker.ietf.org/doc/html/rfc7591), which MCP clients require to register themselves automatically. This example relies on the **Alpic DCR proxy** to bridge that gap. **The full OAuth flow only works when deployed on Alpic** — the local dev server cannot complete MCP client authentication without patching the auth code (see [Local Development](#local-development) below).

## What This Example Showcases

- **Transport-Level Auth**: Auth is enforced at the `/mcp` transport level — unauthenticated requests receive HTTP 401 before reaching any tool handler
- **Auth0 OAuth**: Full OAuth2 setup with JWT verification via JWKS
- **OAuth Metadata Router**: Mounts `mcpAuthMetadataRouter` so MCP clients can discover auth endpoints automatically
- **Alpic DCR Proxy**: Delegates Dynamic Client Registration to Alpic since Auth0 has no public DCR endpoint
- **Personalized Results**: Authenticated users see favorites highlighted and sorted first
- **User Identity in Widgets**: Displays the signed-in user's name directly in the widget UI
- **Simplified Server Setup**: Uses [`server.run()`](https://docs.skybridge.tech/api-reference/run) and `.use()` for a single-file server with no manual Express boilerplate
- **Structured Content & Metadata**: Server passes structured data to widgets via `structuredContent`

## Deploy to Production

**Deploy first** — the full OAuth flow requires the Alpic DCR proxy to be active.

1. Create an account on [Alpic platform](https://app.alpic.ai/).
2. Connect your GitHub repository to automatically deploy at each commit.

[![Deploy it on Alpic](https://assets.alpic.ai/button.svg)](https://app.alpic.ai/new/clone?repositoryUrl=https://github.com/alpic-ai/skybridge&rootDir=examples/auth-auth0)

### Configure Auth0

#### 1. Create an Auth0 Application

1. Sign in to the [Auth0 dashboard](https://manage.auth0.com/).
2. Go to **Applications → Applications → Create Application**.
3. Choose **Regular Web Application** and give it a name.
4. Note your **Domain**, **Client ID**, and **Client Secret**.

#### 2. Create an Auth0 API

Auth0 issues opaque (non-JWT) access tokens by default. To receive a verifiable JWT, you must register an API:

1. Go to **Applications → APIs → Create API**.
2. Set a **Name** (e.g., `My MCP Server`) and an **Identifier** (e.g., `https://your-mcp-server.com`). The identifier is your audience — it does **not** need to be a real URL.
3. Leave the signing algorithm as **RS256**.

#### 3. Set the Default Audience

1. Go to **Settings → Tenant Settings** (top-right avatar menu).
2. Scroll down to the **API Authorization Settings** section.
3. Set **Default Audience** to the API Identifier you created above (e.g., `https://your-mcp-server.com`).
4. Save changes.

### Configure the Alpic DCR Proxy

After deploying your app on Alpic:

1. Open your app in the [Alpic dashboard](https://app.alpic.ai/) and go to **Settings**.
2. Scroll down to the **Authentication** section.
3. Enable the **OAuth Proxy** and fill in:
   - **Client ID** — your Auth0 application's Client ID
   - **Client Secret** — your Auth0 application's Client Secret
   - **Scopes** — the OAuth scopes to request (e.g., `openid profile email`)
4. Save.

Alpic will expose a DCR-compatible `registration_endpoint` and proxy OAuth flows through your Auth0 application. MCP clients can then register and authenticate automatically.

### Set Environment Variables on Alpic

In your app's **Settings → Environment Variables**:

```env
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://your-mcp-server.com
```

## Local Development

> **Note**: Running `npm run dev` starts the server, but MCP clients connecting to `http://localhost:3000/mcp` will fail the OAuth flow — there is no DCR endpoint available locally.

### Test tools locally with a real token (requires patching)

To call tools locally with a real MCP client, patch `server/src/index.ts` to comment out the `requireBearerAuth` middleware and inject a token from your environment instead:

**1. Add `DEV_TOKEN` to your `.env`:**

```env
DEV_TOKEN=any-string-you-want
```

**2. Patch `server/src/index.ts`:**

```ts
// Comment out the bearer auth middleware:
// .use("/mcp", requireBearerAuth({ verifier: { verifyAccessToken } }))

// Add this instead, just before .registerWidget(...):
.use("/mcp", (req, _res, next) => {
  req.auth = {
    token: process.env.DEV_TOKEN ?? "dev-token",
    clientId: "local-dev-user",
    scopes: [],
    extra: { name: "Dev User", email: "dev@example.com" },
  };
  next();
})
```

> Revert both changes before deploying.

### Install

```bash
npm install
# or
pnpm install
# or
bun install
```

### Project structure

```
├── server/
│   └── src/
│       ├── index.ts        # Server entry: McpServer + Auth0 auth + widget + run()
│       ├── auth.ts         # verifyAccessToken — JWT verification via Auth0 JWKS
│       ├── env.ts          # Env validation
│       └── coffee-data.ts  # Mock coffee shop data & search
├── web/
│   └── src/
│       ├── widgets/
│       │   └── search-coffee-paris.tsx  # Coffee shop widget
│       ├── helpers.ts      # Type-safe Skybridge hooks
│       └── index.css       # Parisian theme styles
├── nodemon.json            # Dev server config
└── package.json
```

### Create your first widget

- Register a widget in `server/src/index.ts` with a unique name (e.g., `my-widget`) using [`registerWidget`](https://docs.skybridge.tech/api-reference/register-widget)
- Create a matching React component at `web/src/widgets/my-widget.tsx`. **The file name must match the widget name exactly**.
- Edit components in `web/src/widgets/` — changes appear instantly via Hot Module Replacement.

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [Auth0 Documentation](https://auth0.com/docs/)
- [Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)

# Auth Example — Stytch

An example MCP app built with [Skybridge](https://docs.skybridge.tech/home): a personalized coffee shop finder demonstrating full OAuth authentication with [Stytch](https://stytch.com/).

## What This Example Showcases

- **Transport-Level Auth**: Auth is enforced at the `/mcp` transport level — unauthenticated requests receive HTTP 401 before reaching any tool handler
- **Stytch Connected Apps**: Token verification via the project's JWKS endpoint — no network round-trip per request
- **OAuth Discovery**: `/.well-known/oauth-protected-resource` points MCP clients to your server as the authorization server; `/.well-known/oauth-authorization-server` proxies Stytch's own metadata
- **Personalized Results**: Authenticated users see favorites highlighted and sorted first
- **User Identity in Widgets**: Displays the signed-in user's name directly in the widget UI
- **Simplified Server Setup**: Uses [`server.run()`](https://docs.skybridge.tech/api-reference/run) and `.use()` for a single-file server with no manual Express boilerplate
- **Structured Content & Metadata**: Server passes structured data to widgets via `structuredContent`
- **Hot Module Replacement**: [Live reloading](https://docs.skybridge.tech/concepts/fast-iteration#hmr-with-vite-plugin) of widget components during development
- **Local DevTools**: [DevTools](https://docs.skybridge.tech/devtools) at `http://localhost:3000` for local testing

## Architecture

This example requires two deployed services:

```
MCP Client
    │
    ├─► MCP Server (Alpic)          ← your Skybridge app, enforces Bearer auth
    │       │
    │       └─► JWKS verify         ← fetches keys from your Stytch project domain
    │
    └─► OAuth Authorization Server  ← React SPA deployed on Vercel (app/)
            │
            └─► Stytch IDP          ← handles login (email OTP, Google OAuth) + consent
```

The **MCP Server** (this repo) handles tool calls and verifies tokens.

The **Authorization Server app** (`app/`) is a React SPA that:
- Shows the Stytch login UI (`/login`)
- Handles the OAuth consent screen (`/oauth/authorize`)
- Completes OAuth redirects (`/authenticate`)

Stytch acts as the identity backend — the app just wraps its IDP flows.

## Getting Started

### Prerequisites

- Node.js 24+
- A [Stytch](https://stytch.com/) account
- A [Vercel](https://vercel.com/) account (for the authorization server app)

### 1. Configure Stytch

1. Sign up at [stytch.com](https://stytch.com/) and create a **Consumer** project.
2. In the dashboard, go to **Connected Apps** and create a new Connected App.
3. Note your **Project ID**, **Secret**, and **project domain** (e.g., `https://<slug>.customers.stytch.dev`).
4. Add your Vercel app's `/authenticate` URL to **Redirect URLs** in the Stytch dashboard (`https://stytch.com/dashboard/redirect-urls`). This is required for Google OAuth and email magic links to work.

### 2. Deploy the Authorization Server app to Vercel

The `app/` directory is a standalone React SPA that must be deployed separately on Vercel.

1. In the Vercel dashboard, create a new project pointing to this repository.
2. Set the **Root Directory** to `examples/auth-stytch/app`.
3. Add the environment variable:
   ```
   VITE_STYTCH_PUBLIC_TOKEN=public-token-test-...
   ```
   Get this from your Stytch dashboard under **API Keys**.
4. Deploy. Note the URL (e.g., `https://your-app.vercel.app`).
5. In your Stytch **Connected App** settings, set the **Authorization URL** to `https://your-app.vercel.app/oauth/authorize`.
6. Add `https://your-app.vercel.app/authenticate` to **Redirect URLs** in the Stytch dashboard.

### 3. Configure and run the MCP server locally

Create a `.env` file in the project root:

```env
STYTCH_PROJECT_ID=project-test-...
STYTCH_PROJECT_SECRET=secret-test-...
STYTCH_DOMAIN=https://<slug>.customers.stytch.dev
SERVER_URL=http://localhost:3000
```

Install and start:

```bash
pnpm install
pnpm dev
```

This starts:
- Your MCP server at `http://localhost:3000/mcp`
- Skybridge DevTools UI at `http://localhost:3000`

### 4. Project structure

```
├── app/                            # OAuth Authorization Server (deploy to Vercel)
│   ├── src/
│   │   ├── App.tsx                 # Router: /, /login, /authenticate, /oauth/authorize
│   │   ├── Auth.tsx                # Login, Authorize (consent screen), Authenticate
│   │   └── Home.tsx                # Home page showing login state
│   ├── vercel.json                 # SPA fallback rewrite for client-side routing
│   └── package.json
├── server/
│   └── src/
│       ├── index.ts                # McpServer + auth middleware + widget + run()
│       ├── auth.ts                 # verifyAccessToken — JWKS verification via jose
│       ├── env.ts                  # Env validation
│       └── coffee-data.ts          # Mock coffee shop data & search
├── web/
│   └── src/
│       └── widgets/
│           └── search-coffee-paris.tsx  # Coffee shop widget
└── package.json
```

## Deploy to Production

### MCP Server

Deploy the MCP server to [Alpic](https://alpic.ai/):

1. Create an account on [Alpic](https://app.alpic.ai/).
2. Connect your GitHub repository.
3. Set the root directory to `examples/auth-stytch`.
4. Add the environment variables: `STYTCH_PROJECT_ID`, `STYTCH_PROJECT_SECRET`, `STYTCH_DOMAIN`, `SERVER_URL` (your Alpic deployment URL).

[![Deploy it on Alpic](https://assets.alpic.ai/button.svg)](https://app.alpic.ai/new/clone?repositoryUrl=https://github.com/alpic-ai/skybridge&rootDir=examples/auth-stytch)

### Authorization Server app

Redeploy the Vercel app (see step 2 above). Make sure `SERVER_URL` in your MCP server env points to the Alpic URL, and that the Vercel app URL is registered in both your Stytch Connected App and Redirect URLs settings.

## Known Caveats

### JWKS mismatch with `introspectTokenLocal`

The Stytch SDK's `introspectTokenLocal` fetches JWKS from `api.stytch.com/v1/sessions/jwks/{project_id}`, but Connected Apps tokens are signed by your project's own domain (e.g., `https://<slug>.customers.stytch.dev`). This causes a `JWKSNoMatchingKey` error.

**Fix**: use `jose` directly with the JWKS from `{STYTCH_DOMAIN}/.well-known/jwks.json` instead of `introspectTokenLocal`.

### Double `?` in OAuth callback URL

Stytch appends `?code=...` to the redirect URI even when it already contains query parameters, producing a malformed URL like `/?oauth_callback=true?code=...` that breaks query string parsing.

**Fix**: in `app/src/Auth.tsx`, the redirect URI is normalized before navigation:
```ts
const redirectUri = res.redirect_uri.replace(/\?([^?]*)\?/, "?$1&");
```

### Google OAuth redirect URL must be allowlisted

When using Google OAuth through Stytch, the `login_redirect_url` and `signup_redirect_url` must be explicitly added to the **Redirect URLs** allowlist in the Stytch dashboard (`https://stytch.com/dashboard/redirect-urls`). Failing to do so returns a `no_match_for_provided_oauth_url` 400 error.

### Vercel SPA routing

The `app/` is a React SPA — Vercel returns 404 for deep links like `/oauth/authorize` unless a rewrite rule sends all routes to `index.html`. This is handled by `app/vercel.json`.

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [Stytch Connected Apps](https://stytch.com/docs/connected-apps)
- [Stytch Dashboard — Redirect URLs](https://stytch.com/dashboard/redirect-urls)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)

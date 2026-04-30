# Auth Example — Stytch

An example MCP app built with [Skybridge](https://docs.skybridge.tech/home): a personalized coffee shop finder demonstrating full OAuth authentication with [Stytch](https://stytch.com/).

## What This Example Showcases

- **Transport-Level Auth**: Auth is enforced at the `/mcp` transport level — unauthenticated requests receive HTTP 401 before reaching any tool handler
- **Stytch Connected Apps**: Token verification via the project's JWKS endpoint — no network round-trip per request
- **OAuth Discovery**: `/.well-known/oauth-protected-resource` points MCP clients to your server as the authorization server; `/.well-known/oauth-authorization-server` proxies Stytch's metadata with a patched `authorization_endpoint`
- **Static HTML OAuth pages**: Login, consent, and callback pages are plain HTML files served directly from the MCP server — no separate hosting needed
- **Personalized Results**: Authenticated users see favorites highlighted and sorted first
- **User Identity in Widgets**: Displays the signed-in user's name directly in the widget UI
- **Simplified Server Setup**: Uses [`server.run()`](https://docs.skybridge.tech/api-reference/run) and `.use()` for a single-file server with no manual Express boilerplate
- **Structured Content & Metadata**: Server passes structured data to widgets via `structuredContent`
- **Hot Module Replacement**: [Live reloading](https://docs.skybridge.tech/concepts/fast-iteration#hmr-with-vite-plugin) of widget components during development
- **Local DevTools**: [DevTools](https://docs.skybridge.tech/devtools) at `http://localhost:3000` for local testing

## Architecture

Everything runs from a single deployed service:

```
MCP Client
    │
    └─► MCP Server (Alpic)
            │
            ├─► /assets/authorize.html  ← OAuth consent screen (static HTML)
            ├─► /assets/login.html      ← Stytch login UI (static HTML)
            ├─► /assets/authenticate.html ← OAuth callback handler (static HTML)
            │
            └─► JWKS verify             ← fetches keys from your Stytch project domain
```

The **MCP Server** handles tool calls, verifies tokens, and serves the OAuth authorization pages as static HTML files built with Vite.

Stytch acts as the identity backend — the HTML pages wrap its IDP flows using `@stytch/vanilla-js` loaded via CDN.

## Getting Started

### Prerequisites

- Node.js 24+
- A [Stytch](https://stytch.com/) account

### 1. Configure Stytch

1. Sign up at [stytch.com](https://stytch.com/) and create a **Consumer** project.
2. In the dashboard, go to **Connected Apps** and create a new Connected App.
3. Note your **Project ID**, **Secret**, **project domain** (e.g., `https://<slug>.customers.stytch.dev`), and **Public Token** (under **API Keys**).
4. Set the **Authorization URL** in your Connected App settings to `${SERVER_URL}/assets/authorize.html` (e.g., `http://localhost:3000/assets/authorize.html` for local dev).
5. Add `${SERVER_URL}/assets/authenticate.html` to **Redirect URLs** in the Stytch dashboard (`https://stytch.com/dashboard/redirect-urls`). This is required for Google OAuth and email magic links to work.

### 2. Configure and run the MCP server

Create a `.env` file in `examples/auth-stytch/`:

```env
STYTCH_PROJECT_ID=project-test-...
STYTCH_DOMAIN=https://<project-id>.stytch.com
VITE_STYTCH_PUBLIC_TOKEN=public-token-test-...
SERVER_URL=http://localhost:3000
```

Install and start:

```bash
pnpm install
pnpm dev
```

This starts:
- Your MCP server at `http://localhost:3000/mcp`
- OAuth pages at `http://localhost:3000/assets/{authorize,login,authenticate}.html`
- Skybridge DevTools UI at `http://localhost:3000`

### 3. Project structure

```
├── assets/                         # Static HTML OAuth pages (served by MCP server)
├── src/
│   ├── authorize.html              # OAuth consent screen
│   ├── login.html                  # Stytch login UI
│   └── authenticate.html           # OAuth callback handler
│   ├── server.ts                # McpServer + auth middleware + widget + run()
│   ├── auth.ts                 # verifyAccessToken — JWKS verification via jose
│   ├── env.ts                  # Env validation
│   └── coffee-data.ts          # Mock coffee shop data & search
│   └── views/
│   └── search-coffee-paris.tsx  # Coffee shop widget
└── package.json
```

## Deploy to Production

Deploy the MCP server to [Alpic](https://alpic.ai/):

1. Create an account on [Alpic](https://app.alpic.ai/).
2. Connect your GitHub repository.
3. Set the root directory to `examples/auth-stytch`.
4. Add the environment variables: `STYTCH_PROJECT_ID`, `STYTCH_DOMAIN`, `VITE_STYTCH_PUBLIC_TOKEN`, `SERVER_URL` (your Alpic deployment URL).
5. Update the **Authorization URL** in your Stytch Connected App to `${SERVER_URL}/assets/authorize.html`.
6. Update **Redirect URLs** in Stytch to include `${SERVER_URL}/assets/authenticate.html`.

[![Deploy it on Alpic](https://assets.alpic.ai/button.svg)](https://app.alpic.ai/new/clone?repositoryUrl=https://github.com/alpic-ai/skybridge&rootDir=examples/auth-stytch)

## Known Caveats

### JWKS mismatch with `introspectTokenLocal`

The Stytch SDK's `introspectTokenLocal` fetches JWKS from `api.stytch.com/v1/sessions/jwks/{project_id}`, but Connected Apps tokens are signed by your project's own domain (e.g., `https://<slug>.customers.stytch.dev`). This causes a `JWKSNoMatchingKey` error.

**Fix**: use `jose` directly with the JWKS from `{STYTCH_DOMAIN}/.well-known/jwks.json` instead of `introspectTokenLocal`.

### Double `?` in OAuth callback URL

Stytch appends `?code=...` to the redirect URI even when it already contains query parameters, producing a malformed URL like `/?oauth_callback=true?code=...` that breaks query string parsing.

**Fix**: in `assets/authorize.html`, the redirect URI is normalized before navigation:
```js
const redirectUri = res.redirect_uri.replace(/\?([^?]*)\?/, '?$1&');
```

### Google OAuth redirect URL must be allowlisted

When using Google OAuth through Stytch, the `loginRedirectURL` and `signupRedirectURL` must be explicitly added to the **Redirect URLs** allowlist in the Stytch dashboard (`https://stytch.com/dashboard/redirect-urls`). Failing to do so returns a `no_match_for_provided_oauth_url` 400 error.

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [Stytch Connected Apps](https://stytch.com/docs/connected-apps)
- [Stytch Dashboard — Redirect URLs](https://stytch.com/dashboard/redirect-urls)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)

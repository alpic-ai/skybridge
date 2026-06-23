# Auth Example — Descope on Alpic (DCR Proxy)

An example MCP app built with [Skybridge](https://docs.skybridge.tech/home): a personalized coffee shop finder demonstrating OAuth authentication with [Descope](https://docs.descope.com/mcp), deployed on [Alpic](https://alpic.ai/) using [Alpic's DCR proxy](https://docs.alpic.ai/secure/auth/oauth-setup#using-an-oauth-2-0-compatible-identity-provider-idp-with-no-dcr).

> **Not the same as [`auth-descope`](../auth-descope/)** — that example uses Descope's native Dynamic Client Registration (DCR). This one **disables DCR on Descope** and lets Alpic handle client registration on your behalf.

## What This Example Showcases

- **Alpic DCR proxy**: Descope is an OAuth 2.0 IdP without DCR in this setup — the server advertises OAuth metadata **without** a `registration_endpoint`, so Alpic can inject its DCR proxy after deploy
- **`customProvider` + `serverUrl`**: Uses the low-level provider with `serverUrl` so **this server** is advertised as the authorization server. That keeps Alpic in the registration path instead of delegating straight to Descope
- **Transport-Level Auth**: Auth is enforced at the `/mcp` transport level — unauthenticated requests receive HTTP 401 before reaching any tool handler
- **Descope JWT verification**: Tokens are verified against Descope's JWKS; the audience is the Descope **Project ID** (Descope binds `aud` to `[client, project]`)
- **Personalized Results**: Authenticated users see favorites highlighted and sorted first
- **User Identity in Widgets**: Displays the signed-in user's name directly in the widget UI
- **Simplified Server Setup**: Uses [`server.run()`](https://docs.skybridge.tech/api-reference/run) for a single-file server with no manual Express boilerplate
- **Structured Content & Metadata**: Server passes structured data to widgets via `structuredContent`
- **Hot Module Replacement**: [Live reloading](https://docs.skybridge.tech/concepts/fast-iteration#hmr-with-vite-plugin) of widget components during development
- **Local DevTools**: [DevTools](https://docs.skybridge.tech/devtools) at `http://localhost:3000` for local testing

## Getting Started

### Prerequisites

- Node.js 24+
- A [Descope](https://www.descope.com/) account with an MCP Server configured
- An [Alpic](https://app.alpic.ai/) account (for production deploy and DCR proxy activation)

### Local Development

#### 1. Install

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

#### 2. Configure Descope

1. Sign up at [descope.com](https://www.descope.com/) and create a project.
2. In the console's **MCP Servers** section, create an MCP Server and **leave Dynamic Client Registration disabled**. Alpic's DCR proxy will register OAuth clients for you at deploy time — Descope's own DCR must be off for this pattern to work.
3. Copy the MCP Server's **Discovery URL** from its Connection Information.
4. Create a `.env` file in the project root:

```env
DESCOPE_MCP_SERVER_URL=https://api.descope.com/v1/apps/agentic/<projectId>/<mcpServerId>
SERVER_URL=http://localhost:3000
```

`SERVER_URL` is the URL clients use to reach **this** MCP server. Keep `http://localhost:3000` locally; on Alpic, set it to your deployed URL (or rely on `ALPIC_HOST` — see [Deploy to Production](#deploy-to-production)).

#### 3. Start your local server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

This command starts:

- Your MCP server at `http://localhost:3000/mcp`.
- Skybridge DevTools UI at `http://localhost:3000/`.

#### 4. Project structure

```
├── src/
│   ├── server.ts        # Server entry: McpServer + customProvider auth + widget + run()
│   ├── env.ts           # Env validation
│   └── coffee-data.ts   # Mock coffee shop data & search
│   ├── views/
│   │   └── search-coffee-paris.tsx  # Coffee shop widget
│   ├── helpers.ts       # Type-safe Skybridge hooks
│   └── index.css        # Parisian theme styles
├── nodemon.json         # Dev server config
└── package.json
```

### Create your first widget

#### 1. Add a new widget

- Register a widget in `src/server.ts` with a unique name (e.g., `my-widget`) using [`registerTool`](https://docs.skybridge.tech/api-reference/register-tool)
- Create a matching React component at `src/views/my-widget.tsx`. **The file name must match the widget name exactly**.

#### 2. Edit widgets with Hot Module Replacement (HMR)

Edit and save components in `src/views/` — changes will appear instantly inside your App.

#### 3. Edit server code

Modify files in `src/` and refresh the connection with your testing MCP Client to see the changes.

### Testing your App

You can test your App locally by using our DevTools UI on `http://localhost:3000` while running the dev command.

To test your app with other MCP Clients like ChatGPT, Claude or VSCode, see [Testing Your App](https://docs.skybridge.tech/quickstart/test-your-app).

## Deploy to Production

This example is designed for [Alpic](https://alpic.ai/). The auth wiring in `src/server.ts` matches the [OAuth 2.0 IdP without DCR](https://docs.alpic.ai/secure/auth/oauth-setup#using-an-oauth-2-0-compatible-identity-provider-idp-with-no-dcr) flow from the Alpic docs.

### 1. Deploy on Alpic

1. Create an account on [Alpic platform](https://app.alpic.ai/).
2. Connect your GitHub repository and deploy this example (`examples/auth-descope-alpic`).
3. Set environment variables on Alpic:
   - `DESCOPE_MCP_SERVER_URL` — your Descope MCP Server Discovery URL
   - `SERVER_URL` — your deployed MCP server URL (Alpic also sets `ALPIC_HOST` automatically if you prefer that for OAuth metadata)

[![Deploy it on Alpic](https://assets.alpic.ai/button.svg)](https://app.alpic.ai/new/clone?repositoryUrl=https://github.com/alpic-ai/skybridge&rootDir=examples/auth-descope-alpic)

### 2. Activate Alpic DCR

After deploy, open your project's **Settings** tab:

1. Confirm the server is detected as **Protected** (OAuth metadata is being served without a `registration_endpoint`).
2. Click **Activate Alpic DCR**.
3. In the Descope console, create a **single OAuth client** for Alpic to proxy (use a generic name — it may appear during sign-in). Use the **callback URL** shown in Alpic's activation form.
4. Complete the form with that client's **client ID**, **client secret**, and **scopes**.

Alpic will register MCP clients on your behalf through this proxy client. See the full walkthrough in [Alpic OAuth authentication](https://docs.alpic.ai/secure/auth/oauth-setup).

### 3. Connect MCP clients

Use your remote App URL to connect MCP clients, or test in the Alpic Playground.

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [Descope MCP Documentation](https://docs.descope.com/mcp)
- [Alpic OAuth authentication (DCR proxy)](https://docs.alpic.ai/secure/auth/oauth-setup)
- [Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)

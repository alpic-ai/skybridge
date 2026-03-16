# Auth Example — Auth0

An example MCP app built with [Skybridge](https://docs.skybridge.tech/home): a personalized coffee shop finder demonstrating full OAuth authentication with [Auth0](https://auth0.com/).

## What This Example Showcases

- **Transport-Level Auth**: Auth is enforced at the `/mcp` transport level — unauthenticated requests receive HTTP 401 before reaching any tool handler
- **Auth0 OAuth**: Full OAuth2 setup with JWT verification via JWKS
- **OAuth Metadata Router**: Mounts `mcpAuthMetadataRouter` so MCP clients can discover auth endpoints automatically
- **Personalized Results**: Authenticated users see favorites highlighted and sorted first
- **User Identity in Widgets**: Displays the signed-in user's name directly in the widget UI
- **Simplified Server Setup**: Uses [`server.run()`](https://docs.skybridge.tech/api-reference/run) and `.use()` for a single-file server with no manual Express boilerplate
- **Structured Content & Metadata**: Server passes structured data to widgets via `structuredContent`
- **Hot Module Replacement**: [Live reloading](https://docs.skybridge.tech/concepts/fast-iteration#hmr-with-vite-plugin) of widget components during development
- **Local DevTools**: [DevTools](https://docs.skybridge.tech/devtools) at `http://localhost:3000` for local testing

## Getting Started

### Prerequisites

- Node.js 24+
- An [Auth0](https://auth0.com/) account

### 1. Install

```bash
npm install
# or
pnpm install
# or
bun install
```

### 2. Configure Auth0

#### 2.1 Create an Auth0 Application

1. Sign in to the [Auth0 dashboard](https://manage.auth0.com/).
2. Go to **Applications → Applications → Create Application**.
3. Choose **Regular Web Application** and give it a name.
4. Note your **Domain**, **Client ID**, and **Client Secret**.

#### 2.2 Create an Auth0 API

Auth0 issues opaque (non-JWT) access tokens by default. To receive a verifiable JWT, you must register an API:

1. Go to **Applications → APIs → Create API**.
2. Set a **Name** (e.g., `My MCP Server`) and an **Identifier** (e.g., `https://your-mcp-server.com`). The identifier is your audience — it does **not** need to be a real URL.
3. Leave the signing algorithm as **RS256**.

#### 2.3 Configure Tenant Settings

1. Go to **Settings → Tenant Settings** (top-right avatar menu).
2. In the **API Authorization Settings** section, set **Default Audience** to the API Identifier you created above (e.g., `https://your-mcp-server.com`).
3. Enable **Dynamic Client Registration (DCR)** — this allows MCP clients to register themselves automatically.
4. Activate **Enable Application Connections** — when a new application is created via DCR, all connections will be automatically enabled for it.
5. Save changes.

#### 2.4 Promote Connection to Domain Level

Without this step, applications created via DCR won't have any login connection linked and users won't be able to sign in.

1. Go to **Authentication → Social** (or whichever connection type you use, e.g. Database).
2. Open the connection and go to its **Applications** tab.
3. Enable **Promote Connection to Domain Level**.
4. Save.

#### 2.5 Allow User Access on the API

1. Go to **Applications → APIs** and open the API you created.
2. Go to the **Application Access** tab.
3. Under **Application access policy**, find the **For user access** setting and switch it to **Allow**.
4. Save.

### 3. Create your `.env` file

```env
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://your-mcp-server.com
```

### 4. Start your local server

```bash
npm run dev
# or
pnpm dev
# or
bun dev
```

This command starts:

- Your MCP server at `http://localhost:3000/mcp`.
- Skybridge DevTools UI at `http://localhost:3000/`.

### 5. Project structure

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

### Testing your App

You can test your App locally by using our DevTools UI on `http://localhost:3000` while running the dev command.

To test your app with other MCP Clients like ChatGPT, Claude or VSCode, see [Testing Your App](https://docs.skybridge.tech/quickstart/test-your-app).

## Deploy to Production

Skybridge is infrastructure vendor agnostic, and your app can be deployed on any cloud platform supporting MCP.

The simplest way to deploy your App in minutes is [Alpic](https://alpic.ai/).

1. Create an account on [Alpic platform](https://app.alpic.ai/).
2. Connect your GitHub repository to automatically deploy at each commit.
3. Set your environment variables in **Settings → Environment Variables**:

```env
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://your-mcp-server.com
```

[![Deploy it on Alpic](https://assets.alpic.ai/button.svg)](https://app.alpic.ai/new/clone?repositoryUrl=https://github.com/alpic-ai/skybridge&rootDir=examples/auth-auth0)

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [Auth0 Documentation](https://auth0.com/docs/)
- [Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)

# Auth Example — Descope

An example MCP app built with [Skybridge](https://docs.skybridge.tech/home): a personalized coffee shop finder demonstrating full OAuth authentication with [Descope](https://descope.com/).

## What This Example Showcases

- **Transport-Level Auth**: Auth is enforced at the `/mcp` transport level — unauthenticated requests receive HTTP 401 before reaching any tool handler
- **Descope OAuth**: Full OAuth2 setup with JWT verification via Descope's JWKS endpoint
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
- A [Descope](https://descope.com/) account (free)

### 1. Install

```bash
npm install
```

### 2. Configure Descope

#### 2.1 Get your Project ID

1. Sign in to the [Descope Console](https://app.descope.com).
2. Go to **Settings → Project**.
3. Copy your **Project ID** (starts with `P2...`).

#### 2.2 Create an OIDC Application

1. Go to [Applications](https://app.descope.com/applications) → **+ Application** → **Generic OIDC Application**.
2. Give it a name (e.g., `Skybridge Coffee App`).
3. Under **Flow Hosting URL**, set it to:
   `https://auth.descope.io/<YOUR_PROJECT_ID>?flow=sign-up-or-in`
4. Save the application.

#### 2.3 Note your Client Credentials

From the application settings:
- **Client ID**: your Descope Project ID
- **Client Secret**: create an Access Key at [Access Keys](https://app.descope.com/m2m/accessKeys) — this is used for the token exchange

### 3. Create your `.env` file

```env
DESCOPE_PROJECT_ID=P2xxxxxxxxxxxxxxxxxx
SERVER_URL=http://localhost:3000
```

### 4. Start your local server

```bash
npm run dev
```

This starts:
- Your MCP server at `http://localhost:3000/mcp`
- Skybridge DevTools UI at `http://localhost:3000/`

### 5. Project structure
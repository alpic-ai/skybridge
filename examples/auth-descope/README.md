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
3. Copy your **Project ID** (starts with `P...`).

#### 2.2 Create an MCP Server

1. Go to **Agentic Identity Hub → MCP Servers** → **+ MCP Server**.
2. Give it a name (e.g., `Skybridge Coffee App`).
3. Set the **MCP Server URL** to your server's `/mcp` endpoint:
   - Local: `http://localhost:3000/mcp`
   - Tunnel: `https://<your-tunnel-url>/mcp`
4. Save — copy the **MCP Server ID** (starts with `MS...`).

### 3. Create your `.env` file

```env
DESCOPE_PROJECT_ID=P2xxxxxxxxxxxxxxxxxx
DESCOPE_MCP_SERVER_ID=MSxxxxxxxxxxxxxxxxxx
# SERVER_URL is auto-detected locally; set this only when using --tunnel
# SERVER_URL=https://your-tunnel-url.alpic.app
```

### 4. Start your local server

```bash
npm run dev
```

This starts:
- Your MCP server at `http://localhost:3000/mcp`
- Skybridge DevTools UI at `http://localhost:3000/`

### 5. Using the tunnel

To test with the Alpic playground, start the tunnel instead:

```bash
npm run dev:tunnel
```

Then update the **MCP Server URL** in Descope Console to match the tunnel URL (e.g. `https://your-tunnel.alpic.dev/mcp`) and set `SERVER_URL` in your `.env` to the tunnel base URL (without `/mcp`).

### 6. Project structure

```
src/
  server.ts          # MCP server — tool definitions, auth middleware
  auth.ts            # JWT verification against Descope's JWKS
  env.ts             # Environment variable validation
  coffee-data.ts     # Mock coffee shop data
  views/
    search-coffee-paris.tsx  # React widget rendered in the MCP client
```
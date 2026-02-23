# Auth Example

An example MCP app built with [Skybridge](https://docs.skybridge.tech/home): a personalized coffee shop finder demonstrating full OAuth authentication with [WorkOS AuthKit](https://workos.com/docs/user-management/authkit).

## What This Example Showcases

- **OAuth Authentication**: Full OAuth2 setup with WorkOS AuthKit for user sign-in
- **JWT Verification**: Server-side token validation using JWKS for secure identity extraction
- **Personalized Results**: Authenticated users see favorites highlighted and sorted first
- **User Identity in Widgets**: Displays the signed-in user's name directly in the widget UI
- **Simplified Server Setup**: Uses [`server.run()`](https://docs.skybridge.tech/api-reference/run) and `.use()` for a single-file server with no manual Express boilerplate
- **OAuth Metadata Router**: Mounts `mcpAuthMetadataRouter` so MCP clients can discover auth endpoints automatically
- **Structured Content & Metadata**: Server passes structured data to widgets via `structuredContent`
- **Hot Module Replacement**: [Live reloading](https://docs.skybridge.tech/concepts/fast-iteration#hmr-with-vite-plugin) of widget components during development
- **Local DevTools**: [DevTools](https://docs.skybridge.tech/devtools) at `http://localhost:3000` for local testing

## Getting Started

### Prerequisites

- Node.js 24+
- **WorkOS account** with AuthKit enabled (see step 2 below)

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

#### 2. Set up WorkOS AuthKit

1. Sign up at [WorkOS](https://workos.com/) and enable AuthKit.
2. Get your **AuthKit domain** and **API key** from the WorkOS dashboard.
3. Create a `.env` file in the project root:

```env
AUTHKIT_DOMAIN=your-authkit-domain.authkit.com
WORKOS_API_KEY=sk_test_...
```

#### 3. Start your local server

Run the development server from the root directory:

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
├── server/
│   └── src/
│       ├── index.ts        # Server entry: McpServer + OAuth + widget + run()
│       ├── auth.ts          # JWT verification & WorkOS user lookup
│       ├── env.ts           # Env validation
│       └── coffee-data.ts   # Mock coffee shop data & search
├── web/
│   └── src/
│       ├── widgets/
│       │   └── search-coffee-paris.tsx  # Coffee shop widget
│       ├── helpers.ts       # Type-safe Skybridge hooks
│       └── index.css        # Parisian theme styles
├── nodemon.json             # Dev server config
└── package.json
```

### Create your first widget

#### 1. Add a new widget

- Register a widget in `server/src/index.ts` with a unique name (e.g., `my-widget`) using [`registerWidget`](https://docs.skybridge.tech/api-reference/register-widget)
- Create a matching React component at `web/src/widgets/my-widget.tsx`. **The file name must match the widget name exactly**.

#### 2. Edit widgets with Hot Module Replacement (HMR)

Edit and save components in `web/src/widgets/` — changes will appear instantly inside your App.

#### 3. Edit server code

Modify files in `server/` and refresh the connection with your testing MCP Client to see the changes.

### Testing your App

You can test your App locally by using our DevTools UI on `http://localhost:3000` while running the dev command.

To test your app with other MCP Clients like ChatGPT, Claude or VSCode, see [Testing Your App](https://docs.skybridge.tech/quickstart/test-your-app).

## Deploy to Production

Skybridge is infrastructure vendor agnostic, and your app can be deployed on any cloud platform supporting MCP.

The simplest way to deploy your App in minutes is [Alpic](https://alpic.ai/).

1. Create an account on [Alpic platform](https://app.alpic.ai/).
2. Connect your GitHub repository to automatically deploy at each commit.
3. Use your remote App URL to connect it to MCP Clients, or use the Alpic Playground to easily test your App.

[![Deploy it on Alpic](https://assets.alpic.ai/button.svg)](https://app.alpic.ai/new/clone?repositoryUrl=https://github.com/alpic-ai/skybridge&rootDir=examples/auth)

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [WorkOS AuthKit Documentation](https://workos.com/docs/user-management/authkit)
- [Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)

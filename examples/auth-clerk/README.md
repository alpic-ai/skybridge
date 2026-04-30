# Auth Example — Clerk

An example MCP app built with [Skybridge](https://docs.skybridge.tech/home): a personalized coffee shop finder demonstrating full OAuth authentication with [Clerk](https://clerk.com/).

## What This Example Showcases

- **Transport-Level Auth**: Auth is enforced at the `/mcp` transport level — unauthenticated requests receive HTTP 401 before reaching any tool handler
- **Clerk OAuth**: Uses `@clerk/express` and `@clerk/mcp-tools` to handle sign-in and token verification
- **Personalized Results**: Authenticated users see favorites highlighted and sorted first
- **User Identity in Widgets**: Displays the signed-in user's name directly in the widget UI
- **Simplified Server Setup**: Uses [`server.run()`](https://docs.skybridge.tech/api-reference/run) and `.use()` for a single-file server with no manual Express boilerplate
- **Structured Content & Metadata**: Server passes structured data to widgets via `structuredContent`
- **Hot Module Replacement**: [Live reloading](https://docs.skybridge.tech/concepts/fast-iteration#hmr-with-vite-plugin) of widget components during development
- **Local DevTools**: [DevTools](https://docs.skybridge.tech/devtools) at `http://localhost:3000` for local testing

## Getting Started

### Prerequisites

- Node.js 24+
- A [Clerk](https://clerk.com/) account

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

#### 2. Configure Clerk

1. Sign up at [clerk.com](https://clerk.com/) and create an application.
2. Get your **Publishable Key** and **Secret Key** from the Clerk dashboard.
3. Create a `.env` file in the project root:

```env
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

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
│   ├── server.ts        # Server entry: McpServer + Clerk auth + widget + run()
│   ├── env.ts          # Env validation
│   └── coffee-data.ts  # Mock coffee shop data & search
│   ├── views/
│   │   └── search-coffee-paris.tsx  # Coffee shop widget
│   ├── helpers.ts      # Type-safe Skybridge hooks
│   └── index.css       # Parisian theme styles
├── nodemon.json            # Dev server config
└── package.json
```

### Create your first widget

#### 1. Add a new widget

- Register a widget in `src/server.ts` with a unique name (e.g., `my-widget`) using [`registerTool`](https://docs.skybridge.tech/api-reference/register-tool)
- Create a matching React component at `src/views/my-widget.tsx`. **The file name must match the widget name exactly**.

#### 2. Edit widgets with Hot Module Replacement (HMR)

Edit and save components in `src/views/` — changes will appear instantly inside your App.

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

[![Deploy it on Alpic](https://assets.alpic.ai/button.svg)](https://app.alpic.ai/new/clone?repositoryUrl=https://github.com/alpic-ai/skybridge&rootDir=examples/auth-clerk)

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [Clerk Documentation](https://clerk.com/docs)
- [Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)

# Skybridge Template

A starter TypeScript template for building MCP and ChatGPT Apps with the [Skybridge](https://docs.skybridge.tech) framework.

## Getting Started

### Prerequisites

- Node.js 24+

### Local Development

#### 1. Install

```bash
npm install
# or
pnpm install
# or
bun install
# or
deno install
# or
yarn install
```

#### 2. Start your local server

Run the development server from the root directory:

```bash
npm run dev
# or
pnpm dev
# or
bun dev
# or
deno task dev
# or
yarn dev
```

This command starts:
- Your MCP server at `http://localhost:3000/mcp`.
- Skybridge DevTools UI at `http://localhost:3000`.

#### 3. Project structure

```
├── src/
│   ├── server.ts         # Server entry point
│   ├── views/            # React components (one per view)
│   ├── components/       # Shared UI components
│   ├── helpers.ts        # Shared utilities
│   └── index.css         # Global styles
├── vite.config.ts
├── alpic.json            # Deployment config
└── package.json
```

### Create your first view

#### 1. Add a new view

- Register a tool in `src/server.ts` with a unique name (e.g., `my-view`) using [`registerTool`](https://docs.skybridge.tech/api-reference/register-tool) and a `view` config.
- Create a matching React component at `src/views/my-view.tsx`. **The file name must match the view name exactly**.

#### 2. Edit views with Hot Module Replacement (HMR)

Edit and save components in `src/views/` — changes will appear instantly inside your App.

#### 3. Edit server code

Modify files in `src/` and refresh the tool list with your MCP Client to see the changes.

### Testing your App

You can test your app locally by using our DevTools UI on `http://localhost:3000` while running the `dev` command.

To connect your app with web clients like ChatGPT or Claude, expose your server on the internet by adding the `--tunnel` flag.
By enabling the tunnel, you'll also be able to access a playground to chat with your app and a real LLM. Learn more by reading the [test guide](https://docs.skybridge.tech/quickstart/test-your-app).


## Deploy to Production

Skybridge is infrastructure vendor agnostic, and your app can be deployed on any cloud platform supporting MCP.

The simplest way to deploy your app is by running the `deploy` command, which will push your MCP server to the [Alpic](https://alpic.ai/) cloud for free.

## Resources
- [Skybridge Documentation](https://docs.skybridge.tech/)
- [Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [MCP Apps Documentation](https://github.com/modelcontextprotocol/ext-apps/tree/main)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)

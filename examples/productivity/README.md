# Skybridge Starter

A productivity tracking app showcasing MCP Apps capabilities.

## Getting Started

### Prerequisites

- Node.js 24+

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

#### 2. Start your local server

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

This command starts an Express server on port 3000. This server packages:

- an MCP endpoint on `/mcp` (the app backend)
- a React application on Vite HMR dev server (the UI elements to be displayed in the host)

### Create your first widget

#### 1. Add a new widget

- Register a widget in `server/server.ts` with a unique name (e.g., `my-widget`)
- Create a matching React component at `web/src/widgets/my-widget.tsx`. The file name must match the widget name exactly

#### 2. Edit widgets with Hot Module Replacement (HMR)

Edit and save components in `web/src/widgets/` — changes appear instantly in the host

#### 3. Edit server code

Modify files in `server/` - the server reloads right away

## Deploy to Production

- Use [Alpic](https://alpic.ai/) to deploy your MCP App to production

## Resources
- [MCP Apps repository](https://github.com/modelcontextprotocol/ext-apps)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)

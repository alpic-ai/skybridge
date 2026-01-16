# Ecommerce Carousel Example

## What This Example Showcases
This "Ecommerce Carousel" example demonstrates key Skybridge capabilities:
- **Interactive Widget Rendering**: A React-based widget that displays an interactive product carousel directly in AI conversations
- **Tool Info Access**: Widgets access tool input, output, and metadata via `useToolInfo()` hook
- **Theme Support**: Adapts to light/dark mode using the `useLayout()` hook
- **Localization**: Translates UI based on user locale via `useUser()` hook
- **Persistent State**: Maintains cart state across re-renders using `useWidgetState()` hook
- **Modal Dialogs**: Opens checkout modal via `useRequestModal()` hook
- **External Links**: Opens external URL for checkout completion via `useOpenExternal()` hook
- **External API Integration**: Demonstrates fetching data from REST APIs
- **Hot Module Replacement**: Live reloading of widget components during development

This example serves as a comprehensive reference for building sophisticated, interactive widgets that leverage Skybridge's full feature set.

## Live Demo
Try it for yourself: `https://ecommerce.skybridge.tech/mcp`

## Getting Started

### Prerequisites

- Node.js 22+
- HTTP tunnel such as [ngrok](https://ngrok.com/download)

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

#### 3. Connect to ChatGPT

- ChatGPT requires connectors to be publicly accessible. To expose your server on the Internet, run:
```bash
ngrok http 3000
```
- In ChatGPT, navigate to **Settings → Connectors → Create** and add the forwarding URL provided by ngrok suffixed with `/mcp` (e.g. `https://3785c5ddc4b6.ngrok-free.app/mcp`)

### Create your first widget

#### 1. Add a new widget

- Register a widget in `server/server.ts` with a unique name (e.g., `my-widget`)
- Create a matching React component at `web/src/widgets/my-widget.tsx`. The file name must match the widget name exactly

#### 2. Edit widgets with Hot Module Replacement (HMR)

Edit and save components in `web/src/widgets/` — changes appear instantly in the host

#### 3. Edit server code

Modify files in `server/` and reload your ChatGPT connector in **Settings → Connectors → [Your connector] → Reload**

## Deploy to Production

- Use [Alpic](https://alpic.ai/) to deploy your OpenAI App to production
- In ChatGPT, navigate to **Settings → Connectors → Create** and add your MCP server URL (e.g., `https://your-app-name.alpic.live`)

## Resources

- [Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)

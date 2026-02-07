<p align="center">
  <a href="https://manifest.build/#gh-light-mode-only">
    <img alt="manifest" src="https://manifest.build/assets/images/logo-transparent.svg" height="55px" alt="Manifest logo" title="Manifest - 1-file backend to ship fast
" />
  </a>
  <a href="https://manifest.build/#gh-dark-mode-only">
    <img alt="manifest" src="https://manifest.build/assets/images/logo-light.svg" height="55px" alt="Manifest logo" title="Manifest - 1-file backend to ship fast
" />
  </a>
</p>

# Skybridge + Manifest UI Starter

## What This Example Showcases

Kick start development with full-stack capabilities using Skybridge and [Manifest UI](https://ui.manifest.build) agentic component library for the frontend UI components.

### Skybridge features

- **Interactive Widget Rendering**: A React-based widget that displays an interactive product carousel directly in AI conversations
- **Tool Info Access**: Widgets access tool input, output, and metadata via `useToolInfo()` hook
- **Theme Support**: Adapts to light/dark mode using the `useLayout()` hook
- **Localization**: Translates UI based on user locale via `useUser()` hook
- **Persistent State**: Maintains cart state across re-renders using `useWidgetState()` hook
- **Modal Dialogs**: Opens checkout modal via `useRequestModal()` hook
- **External Links**: Opens external URL for checkout completion via `useOpenExternal()` hook
- **External API Integration**: Demonstrates fetching data from REST APIs
- **Hot Module Replacement**: Live reloading of widget components during development

### Manifest UI features

- **Agentic UI components**: Choose from a wide selection of blocks and components made for agentic usage
- **Shadcn/ui and Tailwind**: Official [shadcn/ui registry](https://ui.shadcn.com/docs/directory?q=manifest) with full compatibility with the 2 most popular UI/CSS libs
- **1-Command install**: With simple CLI commands like `npx shadcn@latest add @manifest/post-card`
- **100% Customizable**: Style once, apply everywhere 

## Live Demo
Try it for yourself: `https://manifest-ui.skybridge.tech/mcp`

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

#### 3. Install new components (Manifest UI)

Choose your component from [Manifest UI website](https://ui.manifest.build) and copy the CLI Command and run it in the `/web` folder:

```bash
cd web

# Install the post-card component with npx
npx shadcn@latest add @manifest/post-card
```

And use it in your widget:

```tsx
 return (
    <Hero
      data={{
        title: "Hello world!",
        subtitle: "Let's build some apps", 
      }}
      actions={{
        onPrimaryClick: () => openExternal("https://docs.skybridge.tech"),
      }}
    />
```

#### 3. Edit server code

Modify files in `server/` and reload your ChatGPT connector in **Settings → Connectors → [Your connector] → Reload**

## Deploy to Production

- Use [Alpic](https://alpic.ai/) to deploy your OpenAI App to production
- In ChatGPT, navigate to **Settings → Connectors → Create** and add your MCP server URL (e.g., `https://your-app-name.alpic.live`)

## Resources

- [Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)

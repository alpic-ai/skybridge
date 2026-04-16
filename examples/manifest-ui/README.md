# Manifest UI Starter

An example MCP app built with [Skybridge](https://docs.skybridge.tech/home): a starter template combining Skybridge with [Manifest UI](https://ui.manifest.build) agentic component library for building rich, interactive widgets.

## What This Example Showcases

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

[Try it in Alpic's Playground](https://manifest-ui.skybridge.tech/try) to launch the live widget experience, or use the MCP URL with your client of choice: `https://manifest-ui.skybridge.tech/mcp`.

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

This command starts:

- Your MCP server at `http://localhost:3000/mcp`.
- Skybridge DevTools UI at `http://localhost:3000/`.

#### 3. Project structure

```
├── server/
│   └── src/
│       └── index.ts           # Server entry point
├── web/
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/            # Manifest UI components (hero, button, …)
│   │   ├── lib/
│   │   │   └── utils.ts       # Shared utilities
│   │   ├── widgets/
│   │   │   └── hello-world.tsx # Example widget
│   │   └── index.css          # Global styles
│   ├── components.json        # shadcn/ui config
│   └── vite.config.ts
├── alpic.json                 # Deployment config
└── package.json
```

### Create your first widget

#### 1. Add a new widget

- Register a widget in `server/src/index.ts` with a unique name (e.g., `my-widget`) using [`registerWidget`](https://docs.skybridge.tech/api-reference/register-widget)
- Create a matching React component at `web/src/widgets/my-widget.tsx`. **The file name must match the widget name exactly**.

#### 2. Edit widgets with Hot Module Replacement (HMR)

Edit and save components in `web/src/widgets/` — changes will appear instantly inside your App.

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

#### 4. Edit server code

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

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [Manifest UI](https://ui.manifest.build)
- [Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)

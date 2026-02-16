# Manifest UI Starter

An example MCP app built with [Skybridge](https://docs.skybridge.tech/home) and [Manifest UI](https://ui.manifest.build): an event ticket browsing app that displays upcoming events using agentic UI components.

## What This Example Showcases

- **Interactive Widget Rendering**: A React-based widget that displays a carousel of event cards directly in AI conversations
- **Agentic UI Components**: Uses the [Manifest UI](https://ui.manifest.build) `EventList` and `EventCard` components from the official [shadcn/ui registry](https://ui.shadcn.com/docs/directory?q=manifest)
- **1-Command Install**: Install new components with simple CLI commands like `npx shadcn@latest add @manifest/event-list`
- **Picture-in-Picture Detail View**: Clicking an event switches to PiP mode with a full event card via `useDisplayMode()` hook
- **Follow-Up Messages**: Sends event details back to the AI for personalized recommendations via `useSendFollowUpMessage()` hook
- **Tool Info Access**: Widgets access tool input, output, and metadata via `useToolInfo()` hook
- **Hot Module Replacement**: Live reloading of widget components during development

## Live Demo

[Try it in Alpic's Playground](https://manifest-ui.skybridge.tech/try) to launch the live widget experience, or use the MCP URL with your client of choice: `https://manifest-ui.skybridge.tech/mcp`.

## Getting Started

### Prerequisites

- Node.js 22+
- HTTP tunnel such as [ngrok](https://ngrok.com/download) if you want to test with remote MCP hosts like ChatGPT or Claude.ai.

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
│       └── index.ts          # Entry point, widget registry & static event data
├── web/
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/
│   │   │       ├── event-list.tsx  # Manifest UI EventList component
│   │   │       ├── event-card.tsx  # Manifest UI EventCard component
│   │   │       ├── button.tsx      # shadcn/ui Button component
│   │   │       └── types.ts       # Shared types (Event, etc.)
│   │   ├── lib/
│   │   │   └── utils.ts      # Utility functions
│   │   ├── widgets/
│   │   │   └── browse-events.tsx  # Event browsing widget
│   │   ├── helpers.ts         # Typed Skybridge helpers
│   │   └── index.css          # Global styles
│   ├── components.json        # shadcn/ui config with Manifest UI registry
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

#### 3. Install new Manifest UI components

Choose your component from [Manifest UI website](https://ui.manifest.build) and run the CLI command in the `/web` folder:

```bash
cd web

# Install a component with npx
npx shadcn@latest add @manifest/event-list
```

And use it in your widget:

```tsx
import { EventList } from "../components/ui/event-list";

return (
  <EventList
    data={{ events, title: "Upcoming Events" }}
    appearance={{ variant: "carousel" }}
    actions={{ onEventSelect: (event) => console.log(event.title) }}
  />
);
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
- [Manifest UI Documentation](https://ui.manifest.build)
- [Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)

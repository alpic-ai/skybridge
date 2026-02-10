# Murder in the Valley

An example MCP app built with [Skybridge](https://docs.skybridge.tech/home): an interactive murder mystery game where players interrogate suspects to solve a crime.

## What This Example Showcases

- **Interactive Widget Rendering**: A React-based widget that displays a multi-screen murder mystery game directly in AI conversations
- **Fullscreen Display Mode**: Switches to immersive fullscreen via `useDisplayMode()` hook
- **Follow-Up Messages**: Sends user choices (e.g. which suspect to interrogate) back to the AI for dynamic responses via `useSendFollowUpMessage()` hook
- **External Links**: Opens external URLs via `useOpenExternal()` hook
- **Hot Module Replacement**: Live reloading of widget components during development

## Live Demo

[Try it in Alpic's Playground](https://murder-in-the-valley.skybridge.tech/try) to launch the live widget experience, or use the MCP URL with your client of choice: `https://murder-in-the-valley.skybridge.tech/mcp`.

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
│       ├── index.ts        # Entry point
│       ├── middleware.ts   # MCP middleware
│       └── server.ts       # Widget registry & game story
├── web/
│   ├── src/
│   │   ├── data/           # Suspects, puzzle, and image data
│   │   ├── widgets/
│   │   │   ├── murder-in-the-valley.tsx  # Main widget entry
│   │   │   ├── screens/    # Start, Intro, Main, Victory screens
│   │   │   ├── components/ # Shared UI (SuspectCard, DialogueBox, puzzle, effects)
│   │   │   └── hooks/      # Custom hooks (useTypewriter)
│   │   └── index.css       # Global styles
│   └── vite.config.ts
├── alpic.json              # Deployment config
├── nodemon.json            # Dev server config
└── package.json
```

### Create your first widget

#### 1. Add a new widget

- Register a widget in `server/src/server.ts` with a unique name (e.g., `my-widget`) using [`registerWidget`](https://docs.skybridge.tech/api-reference/register-widget)
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

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)
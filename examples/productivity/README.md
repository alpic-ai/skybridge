# Productivity Example

An example MCP app built with [Skybridge](https://docs.skybridge.tech/home): interactive productivity charts with localization, display mode, follow-up messages, and widget-to-tool communication.

## What This Example Showcases

- **Interactive Widget Rendering**: A React-based widget that displays interactive productivity charts directly in AI conversations
- **Tool Info Access**: Widgets access tool input, output, and metadata via `useToolInfo()` hook
- **Theme Support**: Adapts to light/dark mode using the `useLayout()` hook
- **Localization**: Translates UI based on user locale via `useUser()` hook (English, French, Spanish, Chinese)
- **Persistent State**: Maintains selected week and chart data across re-renders using `useWidgetState()` hook
- **Display Mode Toggle**: Switches between inline and fullscreen views using `useDisplayMode()` hook
- **Follow-up Messages**: Sends follow-up messages to the AI using `useSendFollowUpMessage()` hook
- **External Links**: Opens external URLs via `useOpenExternal()` hook
- **Widget-to-Tool Communication**: Calls backend tools from the widget using type-safe `useCallTool()` hook
- **LLM Context via data-llm**: Provides contextual information to the AI about the current widget state
- **Hot Module Replacement**: Live reloading of widget components during development

## Example Prompts

- Show me this week's productivity insights
- How much time did I spend learning last week?
- Analyze my productivity trends over the last month

## Live Demo

[Try it in Alpic's Playground](https://productivity.skybridge.tech/try) to launch the live widget experience, or use the MCP URL with your client of choice: `https://productivity.skybridge.tech/mcp`.

## Getting Started

### Prerequisites

- Node.js 24+
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
│       └── index.ts      # Server entry point
├── web/
│   ├── src/
│   │   ├── components/   # Chart UI
│   │   │   ├── BarChart.tsx
│   │   │   ├── DonutChart.tsx
│   │   │   └── Legend.tsx
│   │   ├── widgets/
│   │   │   └── show-productivity-insights.tsx
│   │   ├── helpers.ts    # Shared utilities (useToolInfo, useCallTool)
│   │   ├── i18n.ts       # Localization (en, fr, es, zh)
│   │   └── index.css     # Global styles
│   └── vite.config.ts
├── alpic.json            # Deployment config
├── nodemon.json          # Dev server config
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
- [MCP Apps Documentation](https://github.com/modelcontextprotocol/ext-apps/tree/main)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)

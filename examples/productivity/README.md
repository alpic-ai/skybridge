# Productivity Example

## What This Example Showcases
This "Productivity" example demonstrates key Skybridge capabilities for MCP Apps:
- **Interactive Widget Rendering**: A React-based widget that displays interactive productivity charts directly in AI conversations
- **Tool Info Access**: Widgets access tool input, output, and metadata via `useToolInfo()` hook
- **Theme Support**: Adapts to light/dark mode using the `useLayout()` hook
- **Localization**: Translates UI based on user locale via `useUser()` hook (supports English, French, Spanish, and Chinese)
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
Try it for yourself: `https://productivity.skybridge.tech/mcp`

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

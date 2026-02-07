# Capitals Explorer Example

An example MCP app built with [Skybridge](https://docs.skybridge.tech/home): an interactive map of world capitals with display mode, tool calling, dynamic LLM context, and external APIs.

## What This Example Showcases

- **Interactive Widget Rendering**: A React-based widget that displays an interactive map of world capitals directly in AI conversations
- **Display Mode Switching**: Seamless transition between inline and fullscreen using [useDisplayMode()](https://docs.skybridge.tech/api-reference/use-display-mode)
- **Tool Calling from Widgets**: Widgets call server tools programmatically using [useCallTool()](https://docs.skybridge.tech/api-reference/use-call-tool) to fetch additional data
- **Tool Info Access**: Widgets access tool input, output, and metadata via [useToolInfo()](https://docs.skybridge.tech/api-reference/use-tool-info)
- **Dynamic LLM Context with `data-llm`**: Uses the [data-llm](https://docs.skybridge.tech/api-reference/data-llm) attribute to provide context to the LLM based on user interactions (e.g., which capital is in view)
- **Rich UI Components**: Multi-panel interface with map, sidebar (nearby capitals), and detail panel (population, currencies, photos, Wikipedia)
- **Structured Content & Metadata**: Server passes structured data and metadata to widgets via `_meta` and `structuredContent`
- **External API Integration**: Fetches data from REST Countries API and Wikipedia
- **React Router Integration**: React Router within widgets for navigation
- **Hot Module Replacement**: [Live reloading](https://docs.skybridge.tech/concepts/fast-iteration#hmr-with-vite-plugin) of widget components during development
- **Local DevTools**: [DevTools](https://docs.skybridge.tech/devtools) at `http://localhost:3000` for local testing

## Live Demo

[Try it in Alpic's Playground](https://capitals.skybridge.tech/try) to launch the live widget experience, or use the MCP URL with your client of choice: [https://capitals.skybridge.tech/mcp](https://capitals.skybridge.tech/mcp).

## Getting Started

### Prerequisites

- Node.js 22+
- HTTP tunnel such as [ngrok](https://ngrok.com/download) if you want to test with remote MCP hosts like ChatGPT or Claude.ai.
- **Mapbox API key** (see step 2 below)

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

#### 2. Set up Mapbox API key

This example uses Mapbox for the interactive map. Provide your own Mapbox public token:

1. Sign up at [Mapbox](https://www.mapbox.com/) if needed.
2. Get your public access token from the [Mapbox account page](https://account.mapbox.com/access-tokens/).
3. Create a `.env` file in the `web` directory with your token. See `web/.env.example` for the format.

#### 3. Start your local server

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

#### 4. Project structure

```
├── server/
│   └── src/
│       ├── index.ts      # Entry point
│       ├── middleware.ts # MCP middleware
│       ├── server.ts     # Widget registry & tool handlers
│       ├── capitals.ts   # Capitals data & logic
│       └── env.ts        # Env validation
├── web/
│   ├── .env.example     # Mapbox token template
│   ├── src/
│   │   ├── components/   # Shared UI (e.g. spinner)
│   │   │   └── ui/
│   │   │       └── shadcn-io/
│   │   │           └── spinner/
│   │   ├── data/
│   │   │   └── country-to-capital.ts
│   │   ├── widgets/
│   │   │   ├── explore-capitals.tsx
│   │   │   └── components/
│   │   │       ├── CapitalDetail.tsx
│   │   │       ├── MapView.tsx
│   │   │       └── NearbyList.tsx
│   │   ├── helpers.ts    # Shared utilities
│   │   ├── utils.ts
│   │   └── index.css    # Global styles
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

[![Deploy it on Alpic](https://assets.alpic.ai/button.svg)](https://app.alpic.ai/new/clone?repositoryUrl=https://github.com/alpic-ai/skybridge&rootDir=examples/capitals)

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)

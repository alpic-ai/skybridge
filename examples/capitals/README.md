# Capitals Explorer Example

## What This Example Showcases

This capitals explorer example demonstrates key Skybridge capabilities:

- **Interactive Widget Rendering**: A React-based widget that displays an interactive map of world capitals directly in ChatGPT
- **Display Mode Switching**: Seamless transition between inline and fullscreen display modes using `useDisplayMode()`
- **Tool Calling from Widgets**: Widgets can call server tools programmatically using `useCallTool()` to fetch additional data
- **Tool Info Access**: Widgets access tool input, output, and metadata via `useToolInfo()` hook
- **Dynamic LLM Context with `data-llm`**: Uses the `data-llm` attribute to dynamically provide context to the LLM based on user interactions (e.g., which capital the user is currently viewing), enabling the LLM to understand the current widget state and respond accordingly
- **Rich UI Components**: Multi-panel interface with:
  - Interactive map visualization with clickable capital markers
  - Left sidebar showing nearby capitals sorted by distance
  - Right panel displaying detailed capital information (population, currencies, photos, Wikipedia descriptions)
- **Structured Content & Metadata**: Server passes structured data and metadata (like all capitals list) to widgets via `_meta` and `structuredContent`
- **External API Integration**: Demonstrates fetching data from REST Countries API and Wikipedia
- **React Router Integration**: Shows how to use React Router within widgets for navigation
- **Hot Module Replacement**: Live reloading of widget components during development

This example serves as a comprehensive reference for building sophisticated, interactive widgets that leverage Skybridge's full feature set.

## Live Demo
Try it for yourself: `https://capitals.skybridge.tech/mcp`

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

#### 2. Set up Mapbox API Key

This example requires a Mapbox API key to display the interactive map. You'll need to provide your own Mapbox public token:

1. Sign up for a free account at [Mapbox](https://www.mapbox.com/) if you don't have one
2. Get your public access token from the [Mapbox account page](https://account.mapbox.com/access-tokens/)
3. Create a `.env` file in the `web` directory with your Mapbox token. See `.env.example` for the format.

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

This command starts an Express server on port 3000. This server packages:

- an MCP endpoint on `/mcp` (the app backend)
- a React application on Vite HMR dev server (the UI elements to be displayed in ChatGPT)

#### 4. Connect to ChatGPT

- ChatGPT requires connectors to be publicly accessible. To expose your server on the Internet, run:
```bash
ngrok http 3000
```
- In ChatGPT, navigate to **Settings → Connectors → Create** and add the forwarding URL provided by ngrok suffixed with `/mcp` (e.g. `https://3785c5ddc4b6.ngrok-free.app/mcp`)

#### 5. Test with the emulator

Open http://localhost:3000 in your browser to test your widget using the provided emulator without needing to connect to ChatGPT.

## Deploy to Production

- Use [Alpic](https://alpic.ai/) to deploy your OpenAI App to production
- In ChatGPT, navigate to **Settings → Connectors → Create** and add your MCP server URL (e.g., `https://your-app-name.alpic.live`)

## Resources

- [Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)

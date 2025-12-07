---
sidebar_position: 1
---

# Create your ChatGPT App

The fastest way to start building is using our starter template. It comes pre-configured with the MCP server, UI widgets, and a full dev server with Hot Module Reload.

## Clone the Starter kit

You can [create a new repository](https://github.com/new?template_name=apps-sdk-template&template_owner=alpic-ai) using our [ChatGPT Apps SDK template](https://github.com/alpic-ai/apps-sdk-template), or clone it manually:

```bash
git clone https://github.com/alpic-ai/apps-sdk-template my-chatgpt-app
cd my-chatgpt-app
pnpm install
```

:::info Prerequisites
Make sure you have:
- **Node.js 22+** (see `.nvmrc` in the template for exact version)
- **pnpm** (install with `npm install -g pnpm`)
- **Ngrok** for exposing your local server
:::

## Start the development server

Run the development server from the root directory:

```bash
pnpm dev
```

This command starts an Express server on port 3000 that packages:
- An MCP endpoint on `/mcp` - the ChatGPT App Backend
- A React application on Vite HMR dev server - the ChatGPT App Frontend

## Expose your local server

In a separate terminal, expose your local server using ngrok:

```bash
ngrok http 3000
```

Copy the forwarding URL from ngrok output (e.g., `https://3785c5ddc4b6.ngrok-free.app`)

## Connect to ChatGPT

1. Enable **Settings → Connectors → Advanced → Developer mode** in the ChatGPT client
2. Navigate to **Settings → Connectors → Create**
3. Enter your ngrok URL with the `/mcp` path (e.g., `https://3785c5ddc4b6.ngrok-free.app/mcp`)
4. Click **Create**

## Test your integration

1. Start a new conversation in ChatGPT
2. Select your newly created connector using **the + button → Your connector**
3. Try prompting the model (e.g., "Show me pikachu details")

## Develop with HMR

Now you can edit React components in `web/src/widgets` and see changes instantly:
- Make changes to any component
- Save the file
- The widget will automatically update in ChatGPT without refreshing or reconnecting
- The Express server and MCP server continue running without interruption

**Note:** When you modify widget components, changes will be reflected immediately. If you modify MCP server code (in `server/`), you may need to reload your connector in **Settings → Connectors → [Your connector] → Reload**.

## Widget naming convention

**Important:** For a widget to work properly, the name of the endpoint in your MCP server must match the file name of the corresponding React component in `web/src/widgets/`.

For example:
- If you create a widget endpoint named `pokemon-card`, you must create a corresponding React component file at `web/src/widgets/pokemon-card.tsx`
- The endpoint name and the widget file name (without the `.tsx` extension) must be identical

This naming convention allows the system to automatically map widget requests to their corresponding React components.

## Deploy to production

You can use [Alpic](https://alpic.ai) to deploy your ChatGPT App to production.

In ChatGPT, navigate to **Settings → Connectors → Create** and add your MCP server URL (e.g., `https://your-app-name.alpic.live`)

## What's next?

Now that you have Skybridge running, dive deeper into the framework:

<div className="card-grid">
  <div className="card">
    <h3>💡 Core Concepts</h3>
    <p>Understand how MCP, ChatGPT Apps, and Skybridge work together</p>
    <a href="/concepts" className="card-link">Learn More →</a>
  </div>
  
  <div className="card">
    <h3>🔄 Skybridge Abstractions</h3>
    <p>Learn how Skybridge extends the raw APIs with React hooks</p>
    <a href="/skybridge-abstractions" className="card-link">Explore →</a>
  </div>
  
  <div className="card">
    <h3>📚 API Reference</h3>
    <p>Discover all available hooks and utilities</p>
    <a href="/api-reference" className="card-link">Browse API →</a>
  </div>
</div>

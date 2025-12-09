---
sidebar_position: 1
---

# Create your ChatGPT App

The fastest way to start building is using our starter template. It comes pre-configured with an MCP server, UI widgets, and a full dev server with Hot Module Reload.

## Clone the Starter kit

You can [create a new repository](https://github.com/new?template_name=apps-sdk-template&template_owner=alpic-ai) using our [ChatGPT Apps starter template](https://github.com/alpic-ai/apps-sdk-template), or clone it manually:

```bash
git clone https://github.com/alpic-ai/apps-sdk-template my-chatgpt-app
cd my-chatgpt-app
pnpm install
```

:::info Prerequisites
Make sure you have:
- **Node.js 22+** (see `.nvmrc` in the template for exact version)
- **pnpm** (install with `npm install -g pnpm`)
- **[Ngrok](https://ngrok.com/download)** for exposing your local server
:::

## Start the development server

Run the development server from the root directory:

```bash
pnpm dev
```

This command starts an Express server on port 3000 that packages:
- An MCP endpoint on `/mcp` - the ChatGPT App Backend
- A React application on Vite HMR dev server - the ChatGPT App Frontend


## What's next?

<div className="card-grid">
  <div className="card">
    <h3>Test your App</h3>
    <a href="/quickstart/test-your-app" className="card-link">Connect your local dev server to ChatGPT and start developing with Hot Module Reload →</a>
  </div>
</div>
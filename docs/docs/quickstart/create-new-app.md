---
sidebar_position: 1
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Create your ChatGPT App

The fastest way to start building is using our starter template. It comes pre-configured with an MCP server, UI widgets, and a full dev server with Hot Module Reload.

## Bootstrap your project

Set up your app with a single command:

<Tabs groupId="package-manager">
  <TabItem value="npm" label="npm" default>

```bash
npm create skybridge@latest my-chatgpt-app
```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">

```bash
pnpm create skybridge my-chatgpt-app
```

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
yarn create skybridge my-chatgpt-app
```

  </TabItem>
  <TabItem value="bun" label="bun">

```bash
bun create skybridge my-chatgpt-app
```

  </TabItem>
  <TabItem value="deno" label="deno">

```bash
deno init --npm skybridge my-chatgpt-app
```

  </TabItem>
</Tabs>

:::info Prerequisites
Make sure you have:
- **Node.js 22+**
- **[Ngrok](https://ngrok.com/download)** for exposing your local server
:::

## Start the development server

Run the development server from the root directory:

<Tabs groupId="package-manager">
  <TabItem value="npm" label="npm" default>

```bash
npm run dev
```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">

```bash
pnpm dev
```

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
yarn dev
```

  </TabItem>
  <TabItem value="bun" label="bun">

```bash
bun dev
```

  </TabItem>
  <TabItem value="deno" label="deno">

```bash
deno task dev
```

  </TabItem>
</Tabs>

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
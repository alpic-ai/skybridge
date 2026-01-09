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
- **Node.js 24+**
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

This runs the `skybridge` command, which starts a development server with the following features:

### What it does

The `skybridge` command:
- **Starts an Express server** on port 3000 that packages:
  - An MCP endpoint on `/mcp` - the ChatGPT App Backend
  - A React application on Vite HMR dev server - the ChatGPT App Frontend
- **Watches for file changes** using nodemon, automatically restarting the server when you modify server-side code

### Development workflow

When you run `skybridge`:
1. The server starts and displays the welcome screen in your terminal
2. You can access **DevTools** at `http://localhost:3000/` to test your app locally
3. The **MCP server** is available at `http://localhost:3000/mcp`
4. **File watching** is enabled - changes to server code will automatically restart the server
5. **Hot Module Reload (HMR)** is active for Widgets components - changes appear instantly in ChatGPT without reconnecting

### Using your app in ChatGPT

To use your app directly in ChatGPT:

1. **Start your server** (see above).

2. **Expose your local server to the internet** (so ChatGPT can reach it). The most common option is [ngrok](https://ngrok.com/). In a new terminal, run:

   ```bash
   ngrok http 3000
   ```

   This will give you a public URL such as `https://xxxxxx.ngrok-free.app`.

3. **Connect ChatGPT to your app**:

- In ChatGPT, open **Profile → Apps → Create app**.
- Paste your ngrok URL with `/mcp` at the end, for example:
  ```
  https://xxxxxx.ngrok-free.app/mcp
  ```
- Open a new conversation and select your app using the + button.
- Try prompting the model.

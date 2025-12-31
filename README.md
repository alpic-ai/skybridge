<div align="center">

<img alt="Skybridge" src="docs/static/img/github-banner.png" width="100%">

<br />

# Skybridge

**Build ChatGPT Apps. The Modern TypeScript Way.**

The fullstack TypeScript framework for ChatGPT Apps.<br />
**Type-safe. React-powered. Zero config.**

<br />

[![NPM Version](https://img.shields.io/npm/v/skybridge?color=e90060&style=for-the-badge)](https://www.npmjs.com/package/skybridge)
[![NPM Downloads](https://img.shields.io/npm/dm/skybridge?color=e90060&style=for-the-badge)](https://www.npmjs.com/package/skybridge)
[![GitHub License](https://img.shields.io/github/license/alpic-ai/skybridge?color=e90060&style=for-the-badge)](https://github.com/alpic-ai/skybridge/blob/main/LICENSE)

<br />

[Documentation](https://skybridge.tech) · [Quick Start](https://github.com/new?template_name=apps-sdk-template&template_owner=alpic-ai) · [Examples](https://github.com/alpic-ai/apps-sdk-template)

</div>

<br />

## ✨ Why Skybridge?

ChatGPT Apps let you embed **rich, interactive UIs** directly in conversations. But the raw SDK is low-level—no hooks, no type safety, no dev tools, and no HMR.

**Skybridge fixes that.**

| | |
|:--|:--|
| 👨‍💻 **Full Dev Environment** — HMR, debug traces, and local devtools. No more refresh loops. | ✅ **End-to-End Type Safety** — tRPC-style inference from server to widget. Autocomplete everywhere. |
| 🔄 **Widget-to-Model Sync** — Keep the model aware of UI state with `data-llm`. Dual surfaces, one source of truth. | ⚒️ **React Query-style Hooks** — `isPending`, `isError`, callbacks. State management you already know. |

<br />

## 🚀 Get Started

**Create a new ChatGPT app:**

```bash
npm create skybridge@latest
```

**Or add to an existing project:**

```bash
npm i skybridge
yarn add skybridge
pnpm add skybridge
bun add skybridge
deno add skybridge
```

<div align="center">

**👉 [Read the Docs](https://skybridge.tech) 👈**

</div>

<br />

## 📦 The Stack

- **`skybridge/server`** — Drop-in MCP SDK replacement with widget registration and type inference.
- **`skybridge/web`** — React hooks and components for ChatGPT's runtime.

### Server

```ts
import { McpServer } from "skybridge/server";

server.registerWidget("flights", {}, {
  inputSchema: { destination: z.string() },
}, async ({ destination }) => {
  const flights = await searchFlights(destination);
  return { structuredContent: { flights } };
});
```

### Widget

```tsx
import { useToolInfo } from "skybridge/web";

function FlightsWidget() {
  const { output } = useToolInfo();

  return output.structuredContent.flights.map(f =>
    <FlightCard key={f.id} flight={f} />
  );
}
```

<br />

## 🎯 Features at a Glance

- **Live Reload** — Vite HMR. See changes instantly without reinstalling.
- **Typed Hooks** — Full autocomplete for tools, inputs, outputs.
- **Widget → Tool Calls** — Trigger server actions from UI.
- **Dual Surface Sync** — Keep model aware of what users see with `data-llm`.
- **React Query-style API** — `isPending`, `isError`, callbacks.
- **MCP Compatible** — Extends the official SDK. Works with any MCP client.

<br />

<div align="center">

[![GitHub Discussions](https://img.shields.io/badge/Discussions-Ask%20Questions-blue?style=flat-square&logo=github)](https://github.com/alpic-ai/skybridge/discussions)
[![GitHub Issues](https://img.shields.io/badge/Issues-Report%20Bugs-red?style=flat-square&logo=github)](https://github.com/alpic-ai/skybridge/issues)
[![Discord](https://img.shields.io/badge/Discord-Chat-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.com/invite/gNAazGueab)

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions

<br />

**[MIT License](LICENSE)** · Made with ❤️ by **[Alpic](https://alpic.ai)**

</div>

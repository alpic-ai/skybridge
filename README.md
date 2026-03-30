<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/Skybridgewhite(1).svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/images/Skybridgemidnight.svg">
  <img alt="Skybridge" src="docs/images/Skybridgemidnight.svg" width="100%">
</picture>

<br />

# Skybridge

**Build ChatGPT & MCP Apps. The Modern TypeScript Way.**

The fullstack TypeScript framework for AI-embedded widgets.<br />
**Type-safe. React-powered. Platform-agnostic.**

<br />

[![NPM Version](https://img.shields.io/npm/v/skybridge?color=e90060&style=for-the-badge)](https://www.npmjs.com/package/skybridge)
[![NPM Downloads](https://img.shields.io/npm/dm/skybridge?color=e90060&style=for-the-badge)](https://www.npmjs.com/package/skybridge)
[![GitHub License](https://img.shields.io/github/license/alpic-ai/skybridge?color=e90060&style=for-the-badge)](https://github.com/alpic-ai/skybridge/blob/main/LICENSE)

<br />

[Documentation](https://docs.skybridge.tech) · [Quick Start](https://docs.skybridge.tech/quickstart/create-new-app) · [Showcase](https://docs.skybridge.tech/showcase)

</div>

<br />

## ✨ Why Skybridge?

ChatGPT Apps and MCP Apps let you embed **rich, interactive UIs** directly in AI conversations. But the raw SDKs are low-level—no hooks, no type safety, no dev tools, and no HMR.

**Skybridge fixes that.**

| | |
|:--|:--|
| 🌐 **Write once, run everywhere** — Skybridge works seamlessly with ChatGPT (Apps SDK) and MCP-compatible clients. | ✅ **End-to-End Type Safety** — tRPC-style inference from server to widget. Autocomplete everywhere. |
| 🔄 **Widget-to-Model Sync** — Keep the model aware of UI state with `data-llm`. Dual surfaces, one source of truth. | ⚒️ **React Query-style Hooks** — `isPending`, `isError`, callbacks. State management you already know. |
| 👨‍💻 **Full dev environment** — HMR, debug traces, and local devtools. | 📦 **Showcase Examples** — Production-ready examples to learn from and build upon. |

<br />

## 🚀 Get Started

**Create a new app:**

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

**👉 [Read the Docs](https://docs.skybridge.tech) 👈**

</div>

<br />

## 📦 Architecture

Skybridge is a fullstack framework with unified server and client modules:

- **`skybridge/server`** — Define tools and widgets with full type inference. Extends the MCP SDK.
- **`skybridge/web`** — React hooks that consume your server types. Works with Apps SDK (ChatGPT) and MCP Apps.
- **Dev Environment** — Vite plugin with HMR, DevTools emulator, and optimized builds.

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

  return output.structuredContent.flights.map(flight =>
    <FlightCard key={flight.id} flight={flight} />
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
- **Platform Agnostic** — Works with ChatGPT (Apps SDK) and MCP Apps clients (Goose, VSCode, etc.).
- **MCP Compatible** — Extends the official SDK. Works with any MCP client.

<br />

## 📖 Showcase

Explore production-ready examples:

| Example                | Description                                                                      | Demo                                                | Code                                                                                |
|------------------------|----------------------------------------------------------------------------------|-----------------------------------------------------|-------------------------------------------------------------------------------------|
| **Awaze — Cottage Search** | Holiday cottage search and booking experience — browse properties, filter by location, and explore availability | [Try Demo](https://mcp.cottages.com/try) | —                                                                                                   |
| **Capitals Explorer**     | Interactive world map with geolocation and Wikipedia integration                              | [Try Demo](https://capitals.skybridge.tech/try)           | [View Code](https://github.com/alpic-ai/skybridge/tree/main/examples/capitals)           |
| **Ecommerce Carousel**    | Product carousel with cart, localization, and modals                                          | [Try Demo](https://ecommerce.skybridge.tech/try)          | [View Code](https://github.com/alpic-ai/skybridge/tree/main/examples/ecom-carousel)      |
| **Everything**            | Comprehensive playground showcasing all hooks and features                                    | [Try Demo](https://everything.skybridge.tech/try)         | [View Code](https://github.com/alpic-ai/skybridge/tree/main/examples/everything)         |
| **Investigation Game**    | Interactive murder mystery game with multi-screen gameplay and dynamic story progression      | [Try Demo](https://investigation-game.skybridge.tech/try) | [View Code](https://github.com/alpic-ai/skybridge/tree/main/examples/investigation-game) |
| **Productivity**          | Data visualization dashboard demonstrating Skybridge capabilities for MCP Apps                | [Try Demo](https://productivity.skybridge.tech/try)       | [View Code](https://github.com/alpic-ai/skybridge/tree/main/examples/productivity)       |
| **Time's Up**             | Word-guessing party game where the user gives hints and the AI tries to guess the secret word | [Try Demo](https://times-up.skybridge.tech/try)           | [View Code](https://github.com/alpic-ai/skybridge/tree/main/examples/times-up)           |
| **Lumo — Interactive AI Tutor** | Adaptive educational tutor with Mermaid.js diagrams, mind maps, quizzes, and fill-in-the-blank exercises | [Try Demo](https://lumo-mcp-app-39519fdd.alpic.live/try) | [View Code](https://github.com/connorads/lumo-mcp-app)                                    |
| **Auth — Auth0**          | Full OAuth authentication with Auth0 and personalized coffee shop search                      | —                                                         | [View Code](https://github.com/alpic-ai/skybridge/tree/main/examples/auth-auth0)         |
| **Auth — Clerk**          | Full OAuth authentication with Clerk and personalized coffee shop search                      | —                                                         | [View Code](https://github.com/alpic-ai/skybridge/tree/main/examples/auth-clerk)         |
| **Auth — Stytch**         | Full OAuth authentication with Stytch and personalized coffee shop search                     | —                                                         | [View Code](https://github.com/alpic-ai/skybridge/tree/main/examples/auth-stytch)        |
| **Auth — WorkOS AuthKit** | Full OAuth authentication with WorkOS AuthKit and personalized coffee shop search             | —                                                         | [View Code](https://github.com/alpic-ai/skybridge/tree/main/examples/auth-workos)        |
| **Flight Booking**        | Flight booking carousel with dynamic search and booking flow                                  | [Try Demo](https://flight-booking.skybridge.tech/try)     | [View Code](https://github.com/alpic-ai/skybridge/tree/main/examples/flight-booking)     |
| **Generative UI**         | Dynamic UI generation using json-render and Skybridge                                         | [Try Demo](https://generative-ui.skybridge.tech/try)      | [View Code](https://github.com/alpic-ai/skybridge/tree/main/examples/generative-ui)      |
| **Manifest Starter**      | Starter app with Manifest UI agentic components out-of-the-box                                | [Try Demo](https://manifest-ui.skybridge.tech/try)        | [View Code](https://github.com/alpic-ai/skybridge/tree/main/examples/manifest-ui)        |

See all examples in the [Showcase](https://docs.skybridge.tech/showcase) or browse the [examples/](examples/) directory.

<br />

<div align="center">

[![GitHub Discussions](https://img.shields.io/badge/Discussions-Ask%20Questions-blue?style=flat-square&logo=github)](https://github.com/alpic-ai/skybridge/discussions)
[![GitHub Issues](https://img.shields.io/badge/Issues-Report%20Bugs-red?style=flat-square&logo=github)](https://github.com/alpic-ai/skybridge/issues)
[![Discord](https://img.shields.io/badge/Discord-Chat-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.com/invite/gNAazGueab)

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions

<br />

**[MIT License](LICENSE)** · Made with ❤️ by **[Alpic](https://alpic.ai)**

</div>

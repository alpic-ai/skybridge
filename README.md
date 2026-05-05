<div align="center">

<img alt="Skybridge" src="https://raw.githubusercontent.com/alpic-ai/skybridge/main/docs/images/github-banner.png" width="100%">

<br />

**Build ChatGPT & MCP Apps. The Modern TypeScript Way.**

The fullstack TypeScript framework for AI-embedded views.<br />
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
| 🌐 **Write once, run everywhere** — Skybridge works seamlessly with ChatGPT (Apps SDK) and MCP-compatible clients. | ✅ **End-to-End Type Safety** — tRPC-style inference from server to view. Autocomplete everywhere. |
| 🔄 **View-to-Model Sync** — Keep the model aware of UI state with `data-llm`. Dual surfaces, one source of truth. | ⚒️ **React Query-style Hooks** — `isPending`, `isError`, callbacks. State management you already know. |
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

- **`skybridge/server`** — Define tools and views with full type inference. Extends the MCP SDK.
- **`skybridge/web`** — React hooks that consume your server types. Works with Apps SDK (ChatGPT) and MCP Apps.
- **Dev Environment** — Vite plugin with HMR, DevTools emulator, and optimized builds.

### Server

```ts
import { McpServer } from "skybridge/server";

server.registerView("flights", {}, {
  inputSchema: { destination: z.string() },
}, async ({ destination }) => {
  const flights = await searchFlights(destination);
  return { structuredContent: { flights } };
});
```

### View

```tsx
import { useToolInfo } from "skybridge/web";

function FlightsView() {
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
- **View → Tool Calls** — Trigger server actions from UI.
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



## ❓ FAQ

### General

**What is Skybridge?**
Skybridge is a fullstack TypeScript framework for building AI-embedded views — rich, interactive UIs that run inside AI conversations. It provides type safety, React hooks, HMR, and devtools on top of the raw ChatGPT Apps SDK and MCP SDK.

**How is Skybridge different from raw MCP SDK or ChatGPT Apps SDK?**
The raw SDKs are low-level — no hooks, no type safety, no devtools, and no HMR. Skybridge adds React Query-style hooks, end-to-end type inference, a full dev environment with HMR, and platform-agnostic deployment (ChatGPT + MCP clients).

**What does "platform-agnostic" mean?**
Skybridge apps run on both ChatGPT (via Apps SDK) and any MCP-compatible client (Goose, VS Code, Cursor, etc.). Write once, run everywhere.

### Setup & Configuration

**How do I create a new Skybridge app?**
```bash
npm create skybridge@latest
```
This scaffolds a new project with server tools, React views, and devtools configured.

**Can I add Skybridge to an existing project?**
Yes! Install the package and configure the Vite plugin:
```bash
npm i skybridge
```
See the [Add to Existing App](https://docs.skybridge.tech/quickstart/add-to-existing-app) guide.

**What Node.js version is required?**
Node.js 20+ is recommended. Skybridge uses modern TypeScript features and ESM.

**Do I need a ChatGPT or MCP account?**
For ChatGPT Apps: yes, you need access to the Apps SDK. For MCP Apps: any MCP-compatible client works. See the [Quick Start](https://docs.skybridge.tech/quickstart/create-new-app) for setup details.

### Development

**How does HMR work?**
Skybridge uses a Vite plugin that watches your source files and hot-reloads the app without reinstalling. Changes to tools, views, or config are reflected instantly.

**What are "views"?**
Views are React components that render inside AI conversations. They receive tool output via hooks (`useToolInfo`, `useToolCall`) and can trigger server actions via `useToolCall`.

**How does type safety work?**
Skybridge infers types from your server tool definitions to your React views. Input schemas, output types, and hook return types are all fully typed — autocomplete everywhere.

**Can I use Skybridge with other UI frameworks?**
Skybridge is React-first, but the server-side tool definitions are framework-agnostic. You can use any UI framework for the view layer if you implement the MCP protocol directly.

### Deployment

**How do I deploy a Skybridge app?**
Skybridge apps are deployed as web servers. You can deploy to any platform that supports Node.js (Vercel, Railway, Fly.io, etc.). See the [Deployment Guide](https://docs.skybridge.tech/guides/deployment).

**Can I run Skybridge locally?**
Yes! Run `npm run dev` to start the local dev server with HMR and DevTools emulator.

**What about authentication?**
Skybridge supports OAuth authentication via Auth0, Clerk, Stytch, and WorkOS AuthKit. See the [Auth Examples](https://github.com/alpic-ai/skybridge/tree/main/examples) for reference implementations.

### Troubleshooting

**My app isn't loading in ChatGPT/MCP client**
- Check that your server is running and accessible
- Verify your manifest URL is correct
- Check the browser console for errors
- See the [Debugging Guide](https://docs.skybridge.tech/guides/debugging)

**TypeScript errors in my views**
- Ensure you're using the latest Skybridge version
- Check that your tool definitions match the view expectations
- Run `npx tsc --noEmit` to catch type errors early

**HMR isn't working**
- Ensure Vite is running (`npm run dev`)
- Check that the Vite plugin is configured in your `vite.config.ts`
- Try clearing the Vite cache: `rm -rf node_modules/.vite`

### Help & Community

- **Documentation:** [docs.skybridge.tech](https://docs.skybridge.tech)
- **Discord:** [Join the community](https://discord.com/invite/gNAazGueab)
- **GitHub Discussions:** [Ask questions](https://github.com/alpic-ai/skybridge/discussions)
- **Issues:** [Report bugs](https://github.com/alpic-ai/skybridge/issues)

<div align="center">

[![GitHub Discussions](https://img.shields.io/badge/Discussions-Ask%20Questions-blue?style=flat-square&logo=github)](https://github.com/alpic-ai/skybridge/discussions)
[![GitHub Issues](https://img.shields.io/badge/Issues-Report%20Bugs-red?style=flat-square&logo=github)](https://github.com/alpic-ai/skybridge/issues)
[![Discord](https://img.shields.io/badge/Discord-Chat-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.com/invite/gNAazGueab)

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions

<br />

**[MIT License](LICENSE)** · Made with ❤️ by **[Alpic](https://alpic.ai)**

</div>

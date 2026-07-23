# Ecommerce Example

An example MCP app built with [Skybridge](https://docs.skybridge.tech/home): a winter-sports shop where the model searches a product catalog by keyword and filters, then renders a curated product carousel with a fullscreen product detail.

This is the Skybridge **ecommerce template** — scaffold your own copy with:

```bash
npx skybridge create my-shop --ecom
```

The catalog is served from a [Medusa](https://medusajs.com/) store, but the data source is swappable: the whole integration lives in `src/lib/medusa.ts`.

## What This Example Showcases

- **Two-tool search + render pattern**: A view-less `search-products` tool returns data-only grounding for the model to curate; a separate `render-carousel` tool draws the chosen products as an inline carousel — the classic "reason, then present" split
- **Model context vs. view data**: `search-products` returns everything in `structuredContent` (never shown to the user); `render-carousel` puts full presentational data (images, variants, media) in `_meta` for the view, and only trimmed grounding in `structuredContent`
- **Tool descriptions as behavior**: The server `instructions` and tool descriptions drive a two-phase flow — search silently, then speak only once the carousel renders
- **Inline View Rendering**: A React carousel with a fullscreen product detail (image gallery, variant picker, specs, CTA) rendered directly in AI conversations via a tool `view`
- **Variant-as-product model**: Products expose variation axes (color, size, length) with a sparse variant matrix; the detail view narrows availability per axis
- **CSP Configuration**: Allows the product image host via `resourceDomains` and the storefront CTA via `redirectDomains`
- **Vanilla Extract Design System**: Themed design tokens, sprinkles, and light/dark themes under `src/design/`
- **Ladle Component Stories**: `*.stories.tsx` for every component, previewed with `pnpm ladle`
- **Swappable Data Source**: The catalog integration is isolated in `src/lib/medusa.ts` — point it at any store by editing that one file
- **Hot Module Replacement**: [Live reloading](https://docs.skybridge.tech/concepts/fast-iteration#hmr-with-vite-plugin) of view components during development

## Example Prompts

- Show me some skis
- I need goggles for a bright day
- What cold-weather apparel do you have?

## Live Demo

[Try it in Alpic's Playground](https://ecommerce.skybridge.tech/try) to launch the live widget experience, or use the MCP URL with your client of choice: `https://ecommerce.skybridge.tech/mcp`.

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

#### 2. Point at your own catalog (optional)

The example ships pointed at a demo store, so it runs as-is. To use your own catalog, copy `.env.template` to `.env` and fill in `MEDUSA_BASE_URL` and `MEDUSA_PUBLISHABLE_KEY`. Swapping to a different backend entirely is a matter of rewriting `src/lib/medusa.ts`.

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
│   ├── server.ts        # Server entry point (registers both tools)
│   ├── config.ts        # Search/carousel tuning constants
│   ├── tools/
│   │   ├── search-products.ts   # View-less search tool (data only)
│   │   └── render-carousel.ts   # Carousel tool + product model
│   ├── lib/
│   │   └── medusa.ts    # Catalog data source (swap for your own backend)
│   ├── design/          # Vanilla Extract tokens, sprinkles, themes
│   ├── components/      # Carousel UI + Ladle stories
│   ├── views/
│   │   └── carousel/    # Carousel view + fullscreen product detail
│   └── index.css        # Global styles
├── alpic.json           # Deployment config
├── .env.template        # Medusa credentials template
└── package.json
```

### Component stories

Preview and develop the UI components in isolation with [Ladle](https://ladle.dev/):

```bash
pnpm ladle
```

### Create your first view

#### 1. Add a new view

- Register a view in `src/server.ts` with a unique name (e.g., `my-view`) using [`registerTool`](https://docs.skybridge.tech/api-reference/register-tool)
- Create a matching React component at `src/views/my-view.tsx`. **The file name must match the view name exactly**.

#### 2. Edit views with Hot Module Replacement (HMR)

Edit and save components in `src/views/` — changes will appear instantly inside your App.

#### 3. Edit server code

Modify files in `src/` and refresh the connection with your testing MCP Client to see the changes.

### Testing your App

You can test your App locally by using our DevTools UI on `http://localhost:3000` while running the dev command.

To test your app with other MCP Clients like ChatGPT, Claude or VSCode, see [Testing Your App](https://docs.skybridge.tech/quickstart/test-your-app).

## Deploy to Production

Skybridge is infrastructure vendor agnostic, and your app can be deployed on any cloud platform supporting MCP.

The simplest way to deploy your App in minutes is [Alpic](https://alpic.ai/).

1. Create an account on [Alpic platform](https://app.alpic.ai/).
2. Connect your GitHub repository to automatically deploy at each commit.
3. Use your remote App URL to connect it to MCP Clients, or use the Alpic Playground to easily test your App.

[![Deploy it on Alpic](https://assets.alpic.ai/button.svg)](https://app.alpic.ai/new/clone?repositoryUrl=https://github.com/alpic-ai/skybridge&rootDir=examples/ecommerce)

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [Medusa Documentation](https://docs.medusajs.com/)
- [Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [MCP Apps Documentation](https://github.com/modelcontextprotocol/ext-apps/tree/main)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)

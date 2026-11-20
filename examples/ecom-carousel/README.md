# Ecommerce Example

An example MCP App built with [Skybridge](https://docs.skybridge.tech/home): a winter-sports shop where the model searches a product catalog by keyword and filters, then renders a curated product carousel with a fullscreen product detail.

This is the Skybridge **ecommerce template** — scaffold your own copy with:

```bash
npx skybridge create my-shop --ecom
```

The catalog is served from a [Medusa](https://medusajs.com/) store, but the data source is swappable: the whole integration lives in `src/lib/medusa.ts`.

## What This Example Showcases

- **ChatGPT extensions**: a sidebar and conversation Shop, product mentions, native shopping preferences, and illustrated product-choice forms
- **Explicit discussion context**: attach exact variants with product thumbnails and factual specifications through `useModelContext`; removing a ChatGPT attachment clears the discussion indicator without removing the item from the kit
- **Deep links**: reopen a product with `/products/<product-id>?variant=<variant-id>` through the Shop global entrypoint
- **One shopping tool**: `shop` handles catalogue browsing, search results, curated carousels, and native product choices through its `action` input
- **Model context vs. view data**: concise product grounding goes into `structuredContent`; full images, variants, and presentation data stay in `_meta`
- **Four registered tools**: `shop` is model-facing; `settings-read`, `settings-update`, and `search-mentions` (via `registerMentions`) serve native host integrations
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
- Compare the two goggles I attached
- Help me build a ski-weekend kit

## ChatGPT extensions

1. Open **Skybridge Shop** from ChatGPT's sidebar or a conversation's side panel, or call `shop` with `{}` locally.
2. Browse the catalogue and open a product. Pick a colour and size, then add that exact variant to **My Kit**. The kit is demo UI state that lasts while the Shop view is open; it is not an order or a checkout.
3. Attach products with **Discuss this item** and ask ChatGPT to compare them. Removing an attachment in ChatGPT clears its indicator while the kit stays intact.
4. Search for a catalogue product in the desktop composer's mention picker. The returned resource resolves to catalogue facts.
5. Configure preferred apparel size and colour in native plugin settings. Defaults apply only when the product offers a matching value. Preferences are scoped to the authenticated user or server session and kept in process memory.
6. Ask ChatGPT to let you choose between products to get the illustrated native choice form on a compatible host. Small catalogue thumbnails are embedded as data URIs; the image URL is the fallback.
7. Set `CHATGPT_PLUGIN_ID` to the published plugin ID to enable **Copy product link** on exact variants.

These integrations follow the [OpenAI MCP Extensions specification](https://github.com/openai/mcp-extensions/blob/main/docs/spec.md). Local DevTools renders the views; native sidebar, mentions, settings, and choice forms require a compatible ChatGPT host.

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

#### 2. Configure your catalog

Copy `.env.template` to `.env` and fill in `MEDUSA_BASE_URL` and `MEDUSA_PUBLISHABLE_KEY` for your Medusa store. The checked-in template contains no credentials. Swapping to a different backend entirely is a matter of rewriting `src/lib/medusa.ts`.

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
│   ├── server.ts        # Server entry point (registers tools and extensions)
│   ├── config.ts        # Search/carousel tuning constants
│   ├── tools/
│   │   ├── shop.ts              # Model-facing tool, entrypoints, native choice form
│   │   ├── settings-read.ts     # Native settings read tool
│   │   ├── settings-update.ts   # Native settings update tool
│   │   ├── search-mentions.ts   # Composer mentions + product resources
│   │   ├── search-products.ts   # Internal catalogue search helper
│   │   └── render-carousel.ts   # Internal carousel data helper + product model
│   ├── lib/
│   │   └── medusa.ts    # Catalog data source (swap for your own backend)
│   ├── design/          # Vanilla Extract tokens, sprinkles, themes
│   ├── components/      # Carousel UI + Ladle stories
│   ├── views/
│   │   ├── shop.tsx     # Catalogue and kit workspace
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

[![Deploy it on Alpic](https://assets.alpic.ai/button.svg)](https://app.alpic.ai/new/clone?repositoryUrl=https://github.com/alpic-ai/skybridge&rootDir=examples/ecom-carousel)

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [Medusa Documentation](https://docs.medusajs.com/)
- [ChatGPT Plugins Documentation](https://developers.openai.com/plugins)
- [MCP Apps Documentation](https://github.com/modelcontextprotocol/ext-apps/tree/main)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)

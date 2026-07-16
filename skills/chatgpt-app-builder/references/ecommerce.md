# Fill the template

The `ecom` template is a skeleton: the wiring is in place, the data is not. Two tools: `search-products` (keyword + filters in, matching products out as model-facing structured output) and `render-carousel` (curated product/variant IDs in, an inline carousel out). This reference connects them to a real catalog.

Not in a scaffolded `ecom` project (no `src/tools/`)? Scaffold it first with the `--ecom` flag: [copy-template.md](copy-template.md). Then return here.

Work in the order below. Do not skip ahead: each step depends on the previous ones. Never invent a schema, endpoint, or credential.

## 1. Gather context

Ask the user about their data source: API or database, base URL or connection string, auth method, the product schema (fields and types), the filters and sort options it supports, the image and price fields, and how it paginates. Request any reference docs and save them under `docs/` (create it if missing). Read them before writing code.

## 2. Configure access

List the credentials the data source needs. Have the user fill the `.env`; the server sources `.env` at startup. Never commit `.env` or print secrets.

## 3. Explore the data source

Delegate this to a dedicated subagent with a fresh context window: it runs the real queries and returns only the mapping, so the main agent's context isn't filled with large API payloads.

Have it confirm the exact response shape, the real sort keys, the available filter facets and their values, the image and price fields, how variants/options are represented, and the pagination model, then map each onto the template's shapes. Document your findings in SPEC.md so later work doesn't re-run the exploration.

## 4. Fill the @todos and verify

Layout: `src/config.ts` (shared tuning), `src/types.ts` (shared `Price` and `Attribute` schemas), `src/server.ts` (name/version, server prompt, tool registration), and one file per tool under `src/tools/`.

`grep -rn "@todo" src`, then resolve every marker. Fill the shared items, then each tool: complete its `@todo`s and verify it before moving to the next.

To verify: `pnpm build` (typecheck), then start the dev server and keep it running:

```bash
{pm} run dev   # prints the local MCP URL (default http://localhost:3000/mcp)
```

Each tool's verify curl is in its section below.

### Shared

- [ ] `.env.template`: regenerate from the user's `.env` (same keys, values blanked) so the committed placeholder matches the credentials the integration needs.
- [ ] `src/server.ts` `name` / `version`.
- [ ] `src/server.ts` `instructions`: adapt the server-wide prompt to the catalog.
- [ ] `src/config.ts` `CAROUSEL_MAX_SIZE`: max products the carousel shows.
- [ ] `src/config.ts` `MIN_SEARCH_ITERATIONS`: minimum searches before rendering.

### `search-products` (`src/tools/search-products.ts`)

Keyword/filter search that returns matching products as model-facing grounding. It has NO view, so keep the output to what the model needs to curate (ids + facts), never presentational data (images, media): render-carousel handles that.

- [ ] `description`: describe the catalog, its categories, and the search/curate loop.
- [ ] `_meta`: the invoking and invoked status messages.
- [ ] `inputSchema.keyword`: rewrite the description for the catalog's vocabulary.
- [ ] `inputSchema.sort`: set the real sort options, or remove.
- [ ] `inputSchema` filters: replace `priceRange` with one optional param per real facet.
- [ ] `productSchema` / `outputSchema`: adjust the model-facing fields (`id`, `title`, `description`, `price`, `outOfStock`, `attributes`).
- [ ] `search()`: query the data source with the input params and map each hit into `productSchema`; set `pages` and `totalHits`.
- [ ] `narrate()` NEXT STEPS: adapt the post-search guidance to your flow (framing only; it carries no result data).

Verify: curl the stateless `/mcp` endpoint (`Accept` must include `text/event-stream` or the SDK rejects the request). Set `arguments` to `keyword` plus any `sort`/filters you implemented:

```bash
curl -s http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search-products","arguments":{"keyword":"<real keyword>"}}}'
```

Confirm `result.structuredContent` carries real products from the live source (`result.content` is just the next-step guidance). (`"method":"tools/list"` with no `params` lists the registered schema.)

### `render-carousel` (`src/tools/render-carousel.ts`)

Takes the curated IDs and returns the products for the carousel. The full product data (variants, media, options) rides in `_meta` for the view; a trimmed grounding subset goes to `structuredContent` for the model.

- [ ] Product model (`Product`, `Variant`, `Option`, `Meta`): match your catalog. A `Product` groups sibling `Variant`s and declares the `Option` axes. `variants` is sparse (list only the combinations that exist; a missing one encodes a contingent variation). `card` is the variant or union shown on the carousel card.
- [ ] `getProducts()`: fetch each id and map results into `Product[]`. Pick a mapping strategy (see below).
- [ ] `toStructuredContent()`: choose the model-facing fields per product (grounding only; the view reads the full data from `_meta`).
- [ ] `description`: adapt the wording and brand voice; the behavioral rules (order, no-repeat, accuracy) apply to any catalog.
- [ ] `_meta`: the invoking and invoked status messages.
- [ ] `view` (once built): point it at your carousel view under `src/views/render-carousel`.

#### Mapping ids to products (`getProducts`)

`getProducts` turns the curated ids into `Product[]`. It is unprescriptive: choose what fits your catalog. Whatever `search-products` put in each `id` is what arrives here, so keep the two tools consistent.

**Products have no variants (simple products).** Map each id to a `Product` with a single variant and `options: []`. Nothing else to decide.

**Products have variants.** Choose how variants become carousel cards:

- **Group (one card per product).** All queried variants of a product collapse into a single carousel item. `card` is the union of the product's available variants returned by the data source (e.g. a "from" price, in stock if any variant is), and `card.media` holds one picture per requested variant.
- **One card per requested variant.** Each requested variant is its own carousel item, with `card` set to that variant.

> Either way, each carousel item's `Product` must hold ALL the variants the data source returned in `variants` (only `card` differs). The detail view reads `variants` so the client can switch to any variant.

Cross-cutting: preserve the `ids` order, and decide how to handle ids with no match (skip, or surface them).

Verify: `arguments.ids` is an array of product IDs, in display order:

```bash
curl -s http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"render-carousel","arguments":{"ids":["<real id>"]}}}'
```

Confirm `result._meta.products` carries the full products for the view and `result.structuredContent` the trimmed grounding.

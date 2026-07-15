# Fill the template

The `ecom` template is a skeleton: the wiring is in place, the data is not. One tool, `search-products`, takes a keyword plus filters, runs a `search()` stub, and narrates the results for the model. This reference connects it to a real catalog.

Not in a scaffolded `ecom` project (no `src/tools/search-products.ts`)? Scaffold it first with the `--ecom` flag: [copy-template.md](copy-template.md). Then return here.

Work in the order below. Do not skip ahead: each step depends on the previous ones. Never invent a schema, endpoint, or credential.

## 1. Gather context

Ask the user about their data source: API or database, base URL or connection string, auth method, the product schema (fields and types), the filters and sort options it supports, the image and price fields, and how it paginates.
Request any reference docs and save them under `docs/` (create it if missing). Read them before writing code.

## 2. Configure access

List the credentials the data source needs. Have the user fill the `.env`; the server sources `.env` at startup. Never commit `.env` or print secrets.

## 3. Explore the data source

Using the docs and credentials, run real queries. Confirm the exact response shape, the real sort keys, the available filter facets and their values, the image and price fields, and the pagination model. Map each to the tool's shape before editing.

## 4. Fill the @todos and verify

Layout: `src/config.ts` (shared tuning), `src/server.ts` (name/version, server prompt, tool registration), and one file per tool under `src/tools/`.

`grep -rn "@todo" src`, then resolve every marker. Fill the shared items, then each tool: complete its `@todo`s and verify it before moving to the next.

To verify: `pnpm build` (typecheck), then start the dev server and keep it running:

```bash
{pm} run dev   # prints the local MCP URL (default http://localhost:3000/mcp)
```

Each tool's verify curl is in its section below.

### Shared

- [ ] `.env.template`: regenerate from the user's `.env` (same keys, values blanked) so the committed placeholder matches the credentials the integration needs.
- [ ] `src/server.ts` — `name` / `version`.
- [ ] `src/server.ts` — server `instructions`: adapt the server-wide prompt to the catalog.
- [ ] `src/config.ts` — `CAROUSEL_MAX_SIZE`: number of products to curate toward.
- [ ] `src/config.ts` — `MIN_SEARCH_ITERATIONS`: minimum searches before rendering.

### `search-products` (`src/tools/search-products.ts`)

- [ ] `description`: describe the catalog, its categories, and the search/curate loop.
- [ ] `_meta`: the invoking and invoked status messages.
- [ ] `inputSchema.keyword`: rewrite the description for the catalog's vocabulary.
- [ ] `inputSchema.sort`: set the real sort options, or remove.
- [ ] `inputSchema` filters: replace `priceRange` with one optional param per real facet.
- [ ] `search()`: query the data source with `keyword`, `sort`, and filters; map each hit to `{ id, properties: [{ name, value: string[] }] }[]`; set `pages` and `totalHits`.
- [ ] `narrate()` NEXT STEP: adapt the post-search guidance to your flow.

Verify: curl the stateless `/mcp` endpoint (`Accept` must include `text/event-stream` or the SDK rejects the request). Set `arguments` to `keyword` plus any `sort`/filters you implemented:

```bash
curl -s http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search-products","arguments":{"keyword":"<real keyword>"}}}'
```

Confirm `result.content` carries real products from the live source. (`"method":"tools/list"` with no `params` lists the registered schema.)


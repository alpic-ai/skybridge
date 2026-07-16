# Fill the template

The `ecom` template is a skeleton: the wiring is in place, the data is not. Two tools: `search-products` (keyword + filters in, matching products out as model-facing structured output) and `render-carousel` (curated product/variant IDs in, an inline carousel out). It also ships a vanilla-extract design system under `src/design/`. This reference connects the tools to a real catalog and the design system to the brand's look.

Not in a scaffolded `ecom` project (no `src/tools/`)? Scaffold it first with the `--ecom` flag: [copy-template.md](copy-template.md). Then return here.

Do the prerequisites (steps 1 to 3) first, then implement (step 4). Never invent a schema, endpoint, or credential.

## 1. Gather context

Collect two things up front.

**Data source.** Ask about the API or database, base URL or connection string, auth method, the product schema (fields and types), the filters and sort options it supports, the image and price fields, and how it paginates. Request any reference docs and save them under `docs/` (create it if missing). Read them before writing code.

**Brand assets** (for the design system). Ask whether the brand has a Figma file (a design system, or the design of an existing web / mobile / desktop app) and get the link. If not, get the web app URL and/or screenshots (web, mobile, or desktop). Either way, collect the brand's font files. If there is no brand at all (internal tool, prototype), note that and move on.

Record what you gather in `SPEC.md`.

## 2. Configure access

List the credentials the data source needs. Have the user fill the `.env`; the server sources `.env` at startup. Never commit `.env` or print secrets.

## 3. Explore the data source

Delegate this to a dedicated subagent with a fresh context window: it runs the real queries and returns only the mapping, so the main agent's context isn't filled with large API payloads.

Have it confirm the exact response shape, the real sort keys, the available filter facets and their values, the image and price fields, how variants/options are represented, and the pagination model, then map each onto the template's shapes. Append the findings to `SPEC.md` so later work doesn't re-run the exploration.

## 4. Implementation

```
src/
  config.ts                    shared tuning (carousel size, search iterations)
  types.ts                     shared Price / Attribute schemas
  server.ts                    name, version, prompt, tool registration
  tools/
    search-products.ts         keyword + filters -> matching products (no view)
    render-carousel.ts         curated ids -> products for the carousel view
  design/                      vanilla-extract design system
    primitives.css.ts            raw tokens (colors, type, spacing)
    contract.css.ts              semantic color slots
    themes/{light,dark}.css.ts   slot -> primitive, per mode
    sprinkles.css.ts             atomic style props
    recipes/typography.css.ts    the `text` recipe
    tokens.ts                    barrel (single import door)
  components/view-frame.tsx    ViewFrame: activates the theme
  views/carousel/              carousel view skeleton (separate effort)
```

The template is `@todo`-driven: `grep -rn "@todo" src` lists every decision point. The two subsections below, **Server** and **Design system**, are independent: do them in either order, resolving every `@todo` and verifying as you go. `{pm} run build` typechecks the whole tree at any point.

### Server

Fill `config.ts`, `types.ts`, `server.ts`, and the two tools. Start the dev server and keep it running to verify with curl:

```bash
{pm} run dev   # prints the local MCP URL (default http://localhost:3000/mcp)
```

#### Shared

- [ ] `.env.template`: regenerate from the user's `.env` (same keys, values blanked) so the committed placeholder matches the credentials the integration needs.
- [ ] `src/server.ts` `name` / `version`.
- [ ] `src/server.ts` `instructions`: adapt the server-wide prompt to the catalog.
- [ ] `src/config.ts` `CAROUSEL_MAX_SIZE`: max products the carousel shows.
- [ ] `src/config.ts` `MIN_SEARCH_ITERATIONS`: minimum searches before rendering.

#### `search-products` (`src/tools/search-products.ts`)

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

#### `render-carousel` (`src/tools/render-carousel.ts`)

Takes the curated IDs and returns the products for the carousel. The full product data (variants, media, options) rides in `_meta` for the view; a trimmed grounding subset goes to `structuredContent` for the model.

- [ ] Product model (`Product`, `Variant`, `Option`, `Meta`): match your catalog. A `Product` groups sibling `Variant`s and declares the `Option` axes. `variants` is sparse (list only the combinations that exist; a missing one encodes a contingent variation). `card` is the variant or union shown on the carousel card.
- [ ] `getProducts()`: fetch each id and map results into `Product[]`. Pick a mapping strategy (see below).
- [ ] `toStructuredContent()`: choose the model-facing fields per product (grounding only; the view reads the full data from `_meta`).
- [ ] `description`: adapt the wording and brand voice; the behavioral rules (order, no-repeat, accuracy) apply to any catalog.
- [ ] `_meta`: the invoking and invoked status messages.
- [ ] `view` (once built): point it at your carousel view under `src/views/render-carousel`.

##### Mapping ids to products (`getProducts`)

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

### Design system

Reskin the vanilla-extract design system (`src/design/`) to the brand, using the assets gathered in step 1. The carousel view that consumes it is a skeleton; building it out is a separate effort, so this is only about the tokens and theme.

#### The layers

`src/design/` is a five-tier pipeline. Change values, not the shape:

- `primitives.css.ts`: raw, mode-agnostic scales (space, radius, font, grey ramp, accent, status). The only place hexes and sizes are literal.
- `contract.css.ts`: semantic color slots (`surface` / `content` / `border` / `common`), all `null`. The compiler forces both themes to fill every slot.
- `themes/{light,dark}.css.ts`: map each slot to a primitive, per mode.
- `sprinkles.css.ts`: atomic style props (spacing, color, layout). Leave as-is unless you change the contract.
- `recipes/typography.css.ts`: the `text` recipe. Add a component recipe (button, tag) only when a component has real variants; otherwise style with sprinkles or a `style()` block.

`components/view-frame.tsx` (`ViewFrame`) wraps every view: it activates the theme and pins the base surface, font, and content color. `src/design/tokens.ts` is the single import door: `import { text, sprinkles } from "../design/tokens"`.

#### Fill the design @todos

- [ ] `primitives.css.ts`: replace the neutral placeholders with real brand tokens (colors, type scale, spacing, radius).
- [ ] `themes/{light,dark}.css.ts`: map the slots; keep both in sync (the contract enforces it).
- [ ] `contract.css.ts`: add or remove semantic slots only if your UI needs them.
- [ ] `design/fonts.css` + `public/fonts/`: brand `@font-face`, then point `primitives.font.family` at it.
- [ ] `components/view-frame.tsx`: theme policy (follow the host theme, or lock to light).

Source the token values one of three ways, depending on what step 1 turned up.

#### From a Figma file

With the Figma file from step 1, use the Figma MCP (Dev Mode) to pull the real tokens instead of guessing. Prefer this whenever a file exists.

1. Open the file link from step 1 and locate the foundation frames (colors, typography, spacing). The MCP can navigate the file itself (enumerate pages and frames, search by name, switch pages), so find them without the user's help; ask only if the structure is ambiguous.
2. Read the variables. `get_variable_defs` on the foundation frames returns the color ramps, type scale, and spacing collection. Read the "primitives" / "foundations" frames for the raw palette, and the "semantic" / "core" frames for the light and dark mappings.
3. Populate `primitives.css.ts` (raw ramps and scales) and `themes/{light,dark}.css.ts` (semantic mappings). Keep the shape; replace the values.
4. Record provenance in a comment: the Figma `fileKey` and the node ids you sourced, so the tokens are regenerable (the `@todo` header in `primitives.css.ts` already asks for this).
5. Fonts: add each `@font-face` to `design/fonts.css`, drop the files in `public/fonts/` (served under `/assets/fonts/`), and set `primitives.font.family`.

Delegate the extraction to a subagent when the Figma payload is large, same as the data-source exploration: it returns the token mapping, not the raw dump.

#### From an existing app (no Figma)

With the web app URL and/or screenshots from step 1, lift the system from the shipped product:

- URL: inspect the live site's computed styles and `:root` CSS custom properties (fonts, color ramps, spacing, radii) via browser devtools, and capture the exact values into `primitives.css.ts`. (This is how the reference apps captured values that were not in Figma.)
- Screenshots: derive the palette, type scale, and spacing from them, and use the font files collected in step 1.

Record where each value came from in a comment so it can be re-extracted later.

#### No brand identity

For an internal tool or prototype with no brand, keep the neutral primitives. Set at most a font family and an accent color, confirm light and dark contrast, and move on. Do not invent a brand.

#### Verify

`{pm} run build` compiles the tokens and type-checks the themes (the contract fails the build if either theme leaves a slot unset). Preview the result in the devtools emulator, or with `{pm} run ladle` once you add component stories.

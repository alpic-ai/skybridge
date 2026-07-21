# Fill the template

The `ecom` template is a skeleton: the wiring is in place, the data is not. Two tools: `search-products` (keyword + filters in, matching products out as model-facing structured output, no view) and `render-carousel` (curated product/variant ids in, an inline carousel out). A vanilla-extract design system under `src/design/` styles everything. This reference connects the tools to a real catalog and the design system to the brand.

Not in a scaffolded `ecom` project (no `src/tools/`)? Scaffold it first with the `--ecom` flag: [copy-template.md](copy-template.md). Then return here.

## The path

Six phases, each ending at a gate. Do not start a phase before the previous gate passes. Phases 4 and 5 are independent of each other (5 needs only phase 1's brand assets); phase 6 needs both.

```
1 Gather ──► 2 Explore data ──► 3 Decide UX ──► 4 Server ──┐
     └────────────────────────────────────► 5 Design ──────┴──► 6 Components ──► Final gate
```

Ground rules for every phase:

- Never invent a schema, endpoint, or credential. Everything comes from the user or the live data source.
- `grep -rn "@todo" src` is the master worklist. Resolving a marker means making the decision, applying it, and removing the `@todo` tag; whatever grep still returns is what remains to do.
- Record each confirmed decision in `SPEC.md` as you go. Later phases read it instead of re-asking.
- Delegate heavy-payload exploration (live API queries, Figma reads, devtools dumps) to subagents with fresh context windows; only distilled findings enter the main context. Phases 2 and 5 say when.
- `{pm} run build` typechecks the whole tree at any point.

Orientation map (curated; each phase details its own files):

```
src/
  config.ts                    shared tuning (carousel size, search iterations)
  types.ts                     shared Price / Attribute schemas
  server.ts                    name, version, prompt, tool registration
  tools/
    search-products.ts         keyword + filters -> matching products (no view)
    render-carousel.ts         curated ids -> products for the carousel view
  design/                      vanilla-extract design system (see Phase 5)
  components/                  ViewFrame, ProductCard, ProductCarousel, EmptyState,
                               ImageGallery, VariantPicker, Chip, ExpandableText
  lib/                         format, cx, variants (resolve a selection to a variant)
  views/carousel/              render-carousel view: carousel + product detail
    detail/                      fullscreen product detail (display-mode switch)
```

## Phase 1: gather

Prompt the user for the resources below, in one turn, and wait for their answer. Do not research the catalog or brand on your own yet. For whatever they say they lack, write a short complementary research plan (what you would look up, where, and why) and get the user to sign off on it before running any of it.

**Data source.** API or database, base URL or connection string, auth method, the product schema (fields and types), the filters and sort options it supports, the image and price fields, and how it paginates. Request any reference docs and save them under `docs/` (create it if missing); read them before writing code.

**Brand assets.** A Figma link if the brand has one (a design system, or the design of an existing web / mobile / desktop app). Otherwise the web app URL and/or screenshots. Either way, the brand's font files. No brand at all (internal tool, prototype)? Note that and move on.

**Layout inspiration.** The URL of the catalog's live site, if one exists: phase 3 studies its product cards and product page before proposing layouts. Distinct from the brand assets above, which feed token extraction.

**Access.** List the credentials the data source needs and have the user fill `.env` (the server sources it at startup). Never commit `.env` or print secrets.

**Gate 1:**

- [ ] Data source docs saved under `docs/` and read.
- [ ] Brand assets collected, or "no brand" noted.
- [ ] Live site URL collected, or noted absent.
- [ ] `.env` filled.

## Phase 2: explore the data source

Everything downstream (tool schemas, UX decisions, component choices) is built on what this phase reports, so the discovery must be extensive: docs describe the API's intent, only live responses show its actual shape. Delegate it to a subagent with a fresh context window: it runs the real queries and returns only the findings, so large API payloads never enter the main context.

The subagent's brief:

- **Run many varied queries, not one.** Several keywords across different categories, plus a misspelled and a zero-result query (what does an empty result look like?). Note which response fields are always present and which are optional or null; a field seen once is not a field you can rely on.
- **Exercise every declared capability.** Each documented sort key, each filter facet (and where do facet values come from: an enum, a dedicated endpoint, the response itself?), and the pagination model (page/offset/cursor, page size limits, total count). Confirm they actually work; drop what doesn't.
- **Fetch single products by id**, the way `render-carousel` will: confirm the lookup endpoint, whether ids from search resolve there unchanged, and the batch behavior (one call per id, or a multi-id endpoint?).
- **Dissect variants on a variant-rich product.** Which axes exist (color, size, capacity), how sibling variants and their option values are represented, whether every combination exists or the matrix is sparse, and whether price / stock / images / url vary per variant.
- **Inventory the extras.** Ratings, review counts, discounts and original prices, badges, stock and delivery info, spec attributes, brand, product page URL, number of images per product. Phase 3's layout decisions may only use fields that exist here, so record per field: type, coverage (always / sometimes / rare), and a real example value.
- **Sample the imagery.** A handful of real image URLs from different categories: aspect ratios, cutout vs in-context photography, transparent or white backgrounds, resolution, and any URL-based resizing params. Phase 6 chooses the card and gallery aspect ratio / fit by looking at these, never by guessing.
- **Note the sharp edges.** Rate limits, auth quirks, encoding oddities, slow endpoints, fields whose content is HTML rather than text.

Have it return the findings mapped onto the template's shapes (`productSchema` in search-products, `Product`/`Variant`/`Option` in render-carousel), a full raw JSON sample of one representative product, plus one variant-rich and one edge-case example (out of stock, single image, or missing description).

**Gate 2:**

- [ ] The field mapping, the per-field inventory (type, coverage, example), the raw samples, and the image URLs are appended to `SPEC.md`, so nothing re-runs the exploration.
- [ ] Every capability the tools will expose (sort keys, filters, pagination, id lookup) was verified against the live source, not just the docs.

## Phase 3: decide the UX

Only now, with the confirmed field inventory in `SPEC.md`, settle how the catalog is presented; never decide these ad hoc while coding, and never propose a layout built on a field the data does not carry (no rating row if the API has no ratings, no thumbnail rail if products ship one image). Study the live site from phase 1 for how it lays out its cards and product page, then lock down four decisions; phase 6 applies them:

- **D1, carousel card fields:** which fields beyond image, title, and price to show (rating, discount, badges, tags) and how (for example a tag row).
- **D2, carousel framing:** plain (default), each card boxed (border + surface), or the whole strip boxed. At most one, never both.
- **D3, product detail sections:** which sections appear (identity, price, rating, description, specs, delivery) and their order, in particular what sits before or after the CTA (the skeleton puts specs after the "view on site" CTA).
- **D4, thumbnail rail:** whether the detail gallery shows the desktop thumbnail rail or stays swipe-only.

Play the layout back as two ASCII wireframes and get sign-off: the carousel card (every field placed, D1/D2 visible) and the product detail (every section in order, the gallery/rail per D4, the CTA position per D3). Populate them with real values from the phase 2 exploration, not invented ones. Cheap to redraw, expensive to rebuild. For example:

```
CAROUSEL CARD (one card of the strip, D1 fields placed, D2 = boxed card)

┌──────────────────┐ ┌────────────
│ ╭──────────────╮ │ │ ╭──────────
│ │              │ │ │ │
│ │    image     │ │ │ │   next
│ │       [-30%] │ │ │ │   card…
│ ╰──────────────╯ │ │ ╰──────────
│ Product title on │ │ Other titl…
│ two lines max…   │ │
│ €249  ~€349~     │ │ €89
│ ★ 4.6 (1 204)    │ │ ★ 4.2 (87)
│ (eco) (bestsell) │ │ (new)
└──────────────────┘ └────────────
  image: 1:1, contain, grey stage     badge: discount, top-right
  price: current + struck original    tag row: max 2 chips
```

```
PRODUCT DETAIL (desktop two-column, D4 = rail on; mobile stacks, swipe gallery)

                           │                      Ref #
┌────┬───────────────────┐ │ Brand · Product title
│ th │                   │ │ ★ 4.6 (1 204 reviews)
├────┤                   │ │ €249  ~€349~  (in stock)
│ th │       image       │ │
├────┤                   │ │ Color:  [◉ black] [○ sand]
│ th │                   │ │ Size:   [S] [M] [L] [XL]
├────┤                   │ │
│ .. │                   │ │ Description text, clamped
└────┴───────────────────┘ │ with "read more"…
                           │
                           │ [   View on site  ▸   ]
                           │
                           │ SPECS
                           │ Material    recycled wool
                           │ Weight      340 g
                           │ Made in     Portugal

order: identity ► rating ► price ► variants ► description ► CTA ► specs
gallery sticky on desktop; CTA follows the selected variant's url
```

**Gate 3:**

- [ ] Every field in the wireframes exists in the phase 2 inventory.
- [ ] D1-D4 decided; wireframes signed off by the user.
- [ ] `SPEC.md` records the decisions and the agreed wireframes.

## Phase 4: server

Fill `config.ts`, `types.ts`, `server.ts`, and the two tools. Start the dev server and keep it running:

```bash
{pm} run dev   # prints the local MCP URL (default http://localhost:3000/mcp)
```

### Shared

- [ ] `.env.template`: regenerate from the user's `.env` (same keys, values blanked).
- [ ] `src/server.ts` `name` / `version`.
- [ ] `src/server.ts` `instructions`: adapt the server-wide prompt to the catalog.
- [ ] `src/config.ts` `CAROUSEL_MAX_SIZE`: max products the carousel shows.
- [ ] `src/config.ts` `MIN_SEARCH_ITERATIONS`: minimum searches before rendering.

### `search-products` (`src/tools/search-products.ts`)

Keyword/filter search returning model-facing grounding. No view, so keep the output to what the model needs to curate (ids + facts), never presentational data (images, media): render-carousel handles that.

- [ ] `description`: describe the catalog, its categories, and the search/curate loop.
- [ ] `_meta`: the invoking and invoked status messages.
- [ ] `inputSchema.keyword`: rewrite the description for the catalog's vocabulary.
- [ ] `inputSchema.sort`: set the real sort options, or remove.
- [ ] `inputSchema` filters: replace `priceRange` with one optional param per real facet.
- [ ] `productSchema` / `outputSchema`: adjust the model-facing fields (`id`, `title`, `description`, `price`, `outOfStock`, `attributes`).
- [ ] `search()`: query the data source with the input params and map each hit into `productSchema`; set `pages` and `totalHits`.
- [ ] `narrate()` NEXT STEPS: adapt the post-search guidance to your flow (framing only; it carries no result data).

### `render-carousel` (`src/tools/render-carousel.ts`)

Takes the curated ids and returns the products for the carousel. The full product data (variants, media, options) rides in `_meta` for the view; a trimmed grounding subset goes to `structuredContent` for the model.

- [ ] Product model (`Product`, `Variant`, `Option`, `Meta`): match your catalog. A `Product` groups sibling `Variant`s and declares the `Option` axes. `variants` is sparse (list only the combinations that exist; a missing one encodes a contingent variation). `card` (required) is what the carousel shows for the product, surfaced both to the view and to the model (`structuredContent` is projected from it).
- [ ] `getProducts()`: fetch each id and map results into `Product[]` (mapping strategy below).
- [ ] `toStructuredContent()`: trim each product's `card` and `options` into the model-facing grounding, dropping presentational fields (media, url). The view reads the full products from `_meta`.
- [ ] `description`: adapt the wording and brand voice; the behavioral rules (order, no-repeat, accuracy) apply to any catalog.
- [ ] `_meta`: the invoking and invoked status messages.
- [ ] `view.csp`: add your image host to `resourceDomains` (product images) and the product site to `redirectDomains` (the detail CTA and the host "open in app" URL). `view` itself is already wired to the `carousel` view.

**Mapping ids to products (`getProducts`).** Whatever `search-products` put in each `id` is what arrives here; keep the two tools consistent. Preserve the `ids` order, and decide how to handle ids with no match (skip, or surface them).

- **No variants (simple products):** one `Product` per id with a single variant, `card` set to that variant, `options: []`. Nothing else to decide.
- **Variants, grouped (one card per product):** all queried variants of a product collapse into one carousel item. `card` is the union of the available variants (a "from" price, in stock if any variant is), and `card.media` holds one picture per requested variant.
- **Variants, one card per requested variant:** each requested variant is its own carousel item, `card` set to that variant.

Either way, each item's `Product` must hold ALL the variants the data source returned in `variants` (only `card` differs): the detail view reads `variants` so the client can switch to any of them.

**Gate 4: verify both tools with curl** against the running server. `Accept` must include `text/event-stream` or the SDK rejects the request. (`"method":"tools/list"` with no `params` lists the registered schemas.)

```bash
curl -s http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"<tool>","arguments":<args>}}'
```

- [ ] `search-products` with `{"keyword":"<real keyword>"}` plus any sort/filters you implemented: `result.structuredContent` carries real products from the live source (`result.content` is just the next-step guidance).
- [ ] `render-carousel` with `{"ids":["<real id>", ...]}` in display order: `result._meta.products` carries the full products, `result.structuredContent` the trimmed grounding.

## Phase 5: design system

Reskin `src/design/` to the brand using the phase 1 assets. This phase is only the tokens and theme; the components that consume them are phase 6.

**The layers.** A five-tier pipeline; change values, not the shape:

- `primitives.css.ts`: raw, mode-agnostic scales (space, radius, font, grey ramp, accent, status). The only place hexes and sizes are literal.
- `contract.css.ts`: semantic color slots (`surface` / `content` / `border` / `common`), all `null`. The compiler forces both themes to fill every slot.
- `themes/{light,dark}.css.ts`: map each slot to a primitive, per mode.
- `sprinkles.css.ts`: atomic style props. Leave as-is unless you change the contract.
- `recipes/typography.css.ts`: the `text` recipe. Add a component recipe (button, tag) only when a component has real variants; otherwise style with sprinkles or a `style()` block.

`components/view-frame.tsx` (`ViewFrame`) wraps every view: it activates the theme and pins the base surface, font, and content color. `src/design/tokens.ts` is the single import door: `import { text, sprinkles } from "../design/tokens"`.

**Fill:**

- [ ] `primitives.css.ts`: replace the neutral placeholders with real brand tokens (colors, type scale, spacing, radius).
- [ ] `themes/{light,dark}.css.ts`: map the slots; keep both in sync (the contract enforces it).
- [ ] `contract.css.ts`: add or remove semantic slots only if your UI needs them.
- [ ] `design/fonts.css` + `public/fonts/`: brand `@font-face` (served under `/assets/fonts/`), then point `primitives.font.family` at it.
- [ ] `components/view-frame.tsx`: theme policy (follow the host theme, or lock to light).

**Source the values** one of three ways, per what phase 1 turned up. For the first two routes, delegate the extraction to a subagent with a fresh context window, same as phase 2: Figma payloads and devtools dumps are large and noisy, and only the distilled token mapping (values + provenance) belongs in the main context.

- **Figma file (prefer whenever one exists).** The subagent uses the Figma MCP (Dev Mode). It locates the foundation frames itself (the MCP can enumerate pages, search by name, switch pages); it asks only if the structure is ambiguous. `get_variable_defs` on those frames returns the color ramps, type scale, and spacing: "primitives" / "foundations" frames for the raw palette, "semantic" / "core" frames for the light and dark mappings.
- **Existing app (no Figma).** URL: the subagent inspects the live site's computed styles and `:root` CSS custom properties (fonts, color ramps, spacing, radii) via browser devtools and captures exact values. Screenshots: derive the palette, type scale, and spacing from them, with the collected font files.
- **No brand.** Keep the neutral primitives. Set at most a font family and an accent color, confirm light and dark contrast, and move on. Do not invent a brand.

Whatever the route, record provenance in a comment (Figma `fileKey` + node ids, or the source URL) so the tokens are regenerable.

The design system must be signed off by the user, same as the wireframes in phase 3. Present the retheme for review: point them at the running Ladle (`{pm} run ladle`), alongside a short summary of the chosen tokens (font, accent, surfaces) and where each came from. Rework until they approve; every component inherits these tokens, so a wrong accent fixed now is fixed everywhere.

**Gate 5:**

- [ ] `{pm} run build` passes (the contract fails the build if either theme leaves a slot unset).
- [ ] Retheme previewed in light and dark with `{pm} run ladle`: the stories render the still-skeleton components with the new tokens against mock data.
- [ ] User signed off on the retheme.

## Phase 6: components

The view layer under `src/components/` and `src/views/`, built on the design system. Preview any component in Ladle (`{pm} run ladle`; each `*.stories.tsx` is a story); the devtools emulator shows a view against a live tool call. Verify your own work in the emulator as you go, don't just tell the user to look: drive it through the Chrome DevTools MCP, preferring its WebMCP tools (`list_webmcp_tools` / `execute_webmcp_tool`) over click/screenshot loops to call tools and switch display mode, theme, mobile, and locale; see [run-locally.md](run-locally.md). Apply D1-D4 from `SPEC.md`; use the phase 2 image URLs for every imagery choice.

### Labels (i18n)

All user-facing text is centralized in `src/i18n.ts`, shared across every component. `useLabels()` reads the host locale from `useUser()`, matches on the language subtag (`en-US` -> `en`), and falls back to English. Ships English only.

- [ ] `src/i18n.ts`: adapt the English copy to the brand voice; add a locale key per language you want to support.

### Carousel

`render-carousel`'s inline view (`src/views/carousel/`), plus `ProductCard` (presentational), `ProductCarousel` (scroll-snap track, desktop nav buttons; reports on-screen cards), and `EmptyState`. The view reads `responseMetadata.products` (the tool's `_meta`), renders one card per product, and narrates the on-screen ones via `data-llm`.

- [ ] `product-card.css.ts`: image aspect ratio, `object-fit`, and the surface behind the image, decided by looking at the phase 2 image sample: square vs portrait/landscape; `contain` for cutouts/mixed ratios vs `cover` for consistent photos; neutral grey behind transparent cutouts vs white for full-bleed photos. Use the same choice in the gallery. Also `TITLE_LINES` (title clamp).
- [ ] `product-card.tsx` (D1): extra images from `media` (e.g. hover cross-fade to `media[1]`); extra fields from `attributes` (ratings, tags, badges).
- [ ] `product-carousel.css.ts`: tuning knobs (`gap`, `CARDS_VISIBLE`, `CARDS_VISIBLE_COMPACT`, `COMPACT_MAX_WIDTH`).
- [ ] Framing (D2): the `FRAMED` flag boxes each card (`product-card.tsx`, includes its skeleton) or the whole strip (`product-carousel.tsx`). Both `false` for plain (default); set at most one to `true`. If you enable one, tune the frame (padding, border, radius, shadow) in the matching `.css.ts`.

### Product detail

The fullscreen page opened by tapping a carousel card (`src/views/carousel/detail/`). Not a second tool or view: the carousel orchestrator (`views/carousel/index.tsx`) switches display mode to `fullscreen` and renders the detail over the carousel (hidden, not unmounted). It reads the same `_meta` products, so opening a product and switching variants needs no fetch. Selection, carousel scroll, and the full product spec ride in `useViewState`, so an open detail survives a host remount.

Building blocks in `src/components/` (each previews in Ladle): `ImageGallery`, `VariantPicker` + `Chip`, `ExpandableText`. Variant logic is pure in `src/lib/variants.ts`.

Two facts to preserve when customizing:

- **Variant selection.** `variants` is sparse, so contingency is derived, never ruled: `selectableValues` filters on the other axes' current choices and the picker disables any value with no surviving variant. Selection is in-place (each axis is local state, no remount). The initial selection is the tapped variant (its id equals the opened product id), else the first variant, so the buy CTA is live on open (it disables only if the resolved variant has no link).
- **Grounding.** The detail's `data-llm` narrates only the variant on screen; the full spec (every variant) is pushed to `useViewState` by the orchestrator, so the model can answer questions beyond what is visible. The on-screen spec table is a display choice, not the model's source.

- [ ] Section order (D3): apply the agreed sections and before/after-CTA placement in `detail/index.tsx`.
- [ ] `variant-picker`: chips are the default. For a long text-only axis (many sizes), swap the chip row for a native `<select>`; keep image chips for swatch axes (color, material). Promote an axis to a cross-product switch only if the catalog models it as separate products.
- [ ] `image-gallery` (D4): `THUMBNAIL_RAIL` adds a desktop thumbnail rail (off = swipe only); style the progress bar and, if enabled, the rail.
- [ ] `detail.css.ts`: the two-column breakpoint, and whether the gallery is sticky on desktop.
- [ ] CTA: `viewOnSite` deep-links to `variant.url ?? card.url` (`useOpenExternal`), and `setOpenInAppUrl` points the host "open in app" at the same URL. Needs the product site in the view CSP (phase 4).
- [ ] Specs: a table after the CTA. Group, restyle, or drop it (the full spec is already in view state for the model).

## Final gate

- [ ] `grep -rn "@todo" src` returns nothing.
- [ ] `{pm} run build` passes.
- [ ] Both phase 4 curl checks still pass against live data.
- [ ] Carousel and detail previewed (emulator or Ladle) in light and dark.
- [ ] `SPEC.md` matches what was built.

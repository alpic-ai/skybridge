import { z } from "zod";
import {
  CAROUSEL_MAX_SIZE,
  CAROUSEL_RANGE,
  MIN_SEARCH_ITERATIONS,
} from "../config.js";

// The `search-products` tool: keyword + filters in, matching products out as
// structured output for the model. It has NO view — include only what the model
// needs to curate (ids + properties), never presentational data (images, media);
// render-carousel handles that. Everything this tool needs lives in this file.

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

const inputSchema = {
  // @todo: tune this guidance to your catalog's vocabulary. The model reads
  // it to turn conversational input into a good keyword.
  keyword: z.string().describe(
    `\
Short noun phrases extracted from conversational input. Never pass full sentences. \
ALWAYS use the singular form, not the plural. \
Include color, material, and style descriptors for accuracy. \
For vague gift or occasion queries without a clear product type, use broad category terms. \
Preserve the existing keyword across filter refinements; only replace when the user makes a completely different request.`,
  ),

  // @todo: set the sort options your backend supports (or remove).
  sort: z.enum(["price-asc", "price-desc"]).optional().describe("Sort order."),

  // @todo: declare the filters your catalog supports. Add one param per
  // facet (category, color, size...), each optional so the model only sends
  // what the user asked for. `priceRange` below is just an example, remove it.
  priceRange: z
    .string()
    .optional()
    .describe(
      "Price range in dollars. Format: 'min-max' e.g. '0-500', '1000-2000'.",
    ),
};

type SearchInput = z.infer<z.ZodObject<typeof inputSchema>>;

// ---------------------------------------------------------------------------
// Output — model-facing grounding, returned in structuredContent.
// ---------------------------------------------------------------------------

// The property names the model curates on (grounding only, no presentational data).
// @todo: replace with your catalog's property names.
const propertyName = z.enum(["name", "price", "description"]);

const outputSchema = {
  products: z
    .array(
      z.object({
        id: z.string().describe("Stable product ID; pass to render-carousel."),
        properties: z
          .array(
            z.object({
              name: propertyName.describe("Which property this is."),
              value: z.array(z.string()).describe("The property's value(s)."),
            }),
          )
          .describe("Product properties to curate on."),
      }),
    )
    .describe("Matching products, sorted."),
  pages: z
    .object({
      current: z.number(),
      total: z.number(),
    })
    .optional()
    .describe("Pagination: current page and total page count."),
  totalHits: z
    .number()
    .optional()
    .describe("Total matching products across all pages."),
};

type SearchResults = z.infer<z.ZodObject<typeof outputSchema>>;

// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------

function search(input: SearchInput): SearchResults {
  // @todo: plug in your product API / DB. Query it with the input params and map
  // each result into `products` below. `pages` and `totalHits` are optional.
  return {
    products: [], // { id: string; properties: { name: PropertyName; value: string[] }[] }[]
    pages: { current: 1, total: 1 },
    totalHits: 0,
  };
}

// ---------------------------------------------------------------------------
// Narration — framing + next-step instructions for the model. The products
// themselves ride in structuredContent; this text carries NO result data.
// @todo: customize the NEXT STEPS guidance below for your flow (keep searching
// vs. curate and render). Remind the model to ground claims in the structured
// results and never invent attributes.
// ---------------------------------------------------------------------------

function narrate({ products }: SearchResults): string {
  const size = products.length;

  if (size === 0) {
    return `\
No products found.

NEXT STEP: Broaden the keyword or relax filters, then search again.`;
  }

  if (size < CAROUSEL_MAX_SIZE) {
    return `\
Only a few results.

NEXT STEPS:
1. If the client asked for a specific product by name, these are fine: curate and call render-carousel with the selected IDs.
2. Otherwise, search again with broader terms before rendering.`;
  }

  return `\
Enough results to present.

NEXT STEPS:
1. Curate the best matches for the client's intent from the structured results.
2. Write your recommendation mentioning the selected products.
3. Call render-carousel with the selected IDs.`;
}

// ---------------------------------------------------------------------------
// Tool (registered from server.ts to keep the typed tool chain intact)
// ---------------------------------------------------------------------------

export const searchProductsDefinition = {
  name: "search-products" as const,

  // @todo: describe YOUR catalog and how the agent should search and curate
  // it. This is the model's main guide: be specific about your categories,
  // the multi-call search loop, and when to render vs. keep searching.
  description: `\
Search the product catalog. Handles any query: specific products, broad categories, gifts, occasions, or open discovery.
Never assume a category is unavailable: always search before responding.

The response is data only: a list of matching products (name, ID, price, description, and any product-specific attributes) plus pagination and the available filters. The raw results are for your eyes only: the client never sees them.

NEVER describe or characterize the raw results to the client: do not mention how many there are, what categories they fall into, or that they look off-topic. While searching, stay silent: do not narrate what you are doing, announce searches, or report progress between tool calls. Speak only once the carousel is rendered.

Act on the response as follows:

- FIRST SEARCH: use the keyword only (plus sort if needed). Read the available filters in the response; these are the only valid filter options for follow-ups.
- REFINEMENT: if the user's intent matches an available filter, apply it. If it doesn't match any filter, start a new keyword search.
- ITERATE: a single search is never enough. Run several searches (${MIN_SEARCH_ITERATIONS} minimum) before rendering: vary the keyword, apply a filter, or page deeper, and compare results across them. Quality comes from this multi-call exploration; one call then render gives shallow results.
- CURATION: read results and pick the best matches for the client's intent, grounding your choice in each product's description. If zero results, broaden the keyword or relax filters and search again: do NOT call render-carousel. If fewer than 3 results and the user didn't ask for a specific product, search again with broader terms. Only after exploring across several searches, call render-carousel with the selected IDs.
- PRESENT: Once you have ${CAROUSEL_RANGE} distinct, relevant products, call render-carousel with their IDs. Recommend ONLY AFTER the carousel displays, in carousel order.

The sweet spot is ${CAROUSEL_RANGE} products.
`,
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
    destructiveHint: false,
  },

  // @todo: customize the status messages shown in ChatGPT while the tool runs.
  _meta: {
    "openai/toolInvocation/invoking": "Searching",
    "openai/toolInvocation/invoked": "Done searching",
  },

  inputSchema,
  outputSchema,
};

export function searchProductsHandler(input: SearchInput) {
  const results = search(input);
  return {
    structuredContent: results,
    content: [{ type: "text" as const, text: narrate(results) }],
    isError: false,
  };
}

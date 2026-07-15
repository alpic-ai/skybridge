import { z } from "zod";
import {
  CAROUSEL_MAX_SIZE,
  CAROUSEL_RANGE,
  MIN_SEARCH_ITERATIONS,
} from "../config.js";

// The `search-products` tool: takes a keyword + filters, queries your catalog,
// and narrates the results as text for the model (the user never sees them).
// Everything this tool needs lives in this file.

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
// Data access
// ---------------------------------------------------------------------------

type SearchResults = {
  keyword: string;
  products: { id: string; properties: { name: string; value: string[] }[] }[];
  pages?: { current: number; total: number };
  totalHits?: number;
};

function search(input: SearchInput): SearchResults {
  // @todo: plug in your product API / DB. Query it with the input params and map
  // each result into `products` below. `pages` and `totalHits` are optional.
  return {
    keyword: input.keyword,
    products: [], // { id: string; properties: { name: string; value: string[] }[] }[]
    pages: { current: 1, total: 1 },
    totalHits: 0,
  };
}

// ---------------------------------------------------------------------------
// Narration — render results as text for the model (client never sees this)
// ---------------------------------------------------------------------------

function narrate({
  keyword,
  pages,
  products,
  totalHits,
}: SearchResults): string {
  const size = products.length;
  if (size <= 0) {
    return "No product found.";
  }

  let header = `${size} product${size === 1 ? "" : "s"} found for ${keyword}.`;
  if (pages) {
    header += ` Page ${pages.current} of ${pages.total}.`;
  }
  if (totalHits) {
    header += ` Total hits: ${totalHits}.`;
  }

  const body = [header];
  for (const { id, properties } of products) {
    const item = [`# ID: ${id}`];
    for (const { name, value } of properties) {
      item.push(`- ${name}: ${value.join(", ")}`);
    }
    body.push(item.join("\n"));
  }

  // @todo: customize this NEXT STEP guidance for your flow. It steers what the
  // model does after a search (keep searching vs. curate and render).
  const footer =
    size < CAROUSEL_MAX_SIZE
      ? `\
NEXT STEP: Only a few results found.
If the client asked for a specific product by name, these are fine: curate and call render-carousel with selected IDs.
Otherwise, search again with broader terms before rendering.`
      : `\
NEXT STEP:
1. Curate the best matches for the client's intent from the list above.
2. Write your recommendation mentioning the selected products.
3. Call render-carousel with the selected IDs.`;

  body.push(footer);
  return body.join("\n\n");
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
};

export function searchProductsHandler(input: SearchInput) {
  return {
    content: [{ type: "text" as const, text: narrate(search(input)) }],
    isError: false,
  };
}

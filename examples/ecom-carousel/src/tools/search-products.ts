import { z } from "zod";
import { CAROUSEL_RANGE, MIN_SEARCH_ITERATIONS } from "../config.js";
import {
  fetchSearch,
  fromPrice,
  readBadges,
  readNumber,
  readSpecs,
} from "../lib/medusa.js";
import { PriceSchema, SpecSchema } from "../types.js";

// The `search-products` tool: keyword + filters in, matching products out as
// structured output for the model. It has NO view — include only what the model
// needs to curate (ids + properties), never presentational data (images, media);
// render-carousel handles that. Everything this tool needs lives in this file.

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

const inputSchema = {
  keyword: z.string().describe(
    `\
Short noun phrases extracted from conversational input, matched against product titles, descriptions, and SKUs. Never pass full sentences. \
ALWAYS use the singular form, not the plural. \
Include color or material descriptors when the user mentions them (e.g. "cyan skis", "fur hat"). \
This is a small winter-sports catalog: skis, goggles, and cold-weather apparel. For vague or broad requests use a plain category term. \
Preserve the existing keyword across refinements; only replace when the user asks for something different.`,
  ),

  sort: z
    .enum(["price-asc", "price-desc", "newest", "name"])
    .optional()
    .describe("Sort order. Price sorts are applied over the fetched results."),

  category: z
    .enum(["apparel", "goggles", "skis"])
    .optional()
    .describe(
      "Restrict to one category. Only these three exist; omit to search all.",
    ),
};

type SearchInput = z.infer<z.ZodObject<typeof inputSchema>>;

// ---------------------------------------------------------------------------
// Output — model-facing grounding, returned in structuredContent.
// ---------------------------------------------------------------------------

const productSchema = z.object({
  id: z.string().describe("Stable product ID; pass to render-carousel."),
  title: z.string(),
  category: z.string().optional().describe("apparel, goggles, or skis."),
  description: z.string().optional(),
  price: PriceSchema.optional().describe('"From" price (cheapest variant).'),
  rating: z.number().optional().describe("Average review rating, 0–5."),
  reviewCount: z.number().optional(),
  badges: z
    .array(z.string())
    .optional()
    .describe('Display badges, e.g. "New", "Bestseller".'),
  specs: z
    .array(SpecSchema)
    .describe("Product-specific facts to curate on (material, dimensions…)."),
});

const outputSchema = {
  products: z.array(productSchema).describe("Matching products, sorted."),
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

type SearchOutput = z.infer<z.ZodObject<typeof outputSchema>>;

// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------

// Server-side sort keys (price sort is unsupported by Medusa, applied below).
const ORDER: Record<string, string | undefined> = {
  name: "title",
  newest: "-created_at",
};

async function search(input: SearchInput): Promise<SearchOutput> {
  const { products: raw, count } = await fetchSearch({
    keyword: input.keyword,
    category: input.category,
    order: input.sort ? ORDER[input.sort] : undefined,
  });

  const products: SearchOutput["products"] = raw.map((p) => {
    const amount = fromPrice(p);
    return {
      id: p.id,
      title: p.title,
      category: p.categories?.[0]?.name,
      description: p.description ?? undefined,
      price: amount != null ? { amount, currency: "EUR" } : undefined,
      rating: readNumber(p.metadata, "rating"),
      reviewCount: readNumber(p.metadata, "review_count"),
      badges: readBadges(p.metadata),
      // Specs live on the variant; use the first variant as a representative.
      specs: readSpecs(p.variants?.[0]?.metadata),
    };
  });

  // Price sort is client-side (Medusa can't sort by calculated_price).
  if (input.sort === "price-asc" || input.sort === "price-desc") {
    const dir = input.sort === "price-asc" ? 1 : -1;
    products.sort(
      (a, b) => ((a.price?.amount ?? 0) - (b.price?.amount ?? 0)) * dir,
    );
  }

  return {
    products,
    pages: { current: 1, total: 1 },
    totalHits: count,
  };
}

// ---------------------------------------------------------------------------
// Narration — framing + next-step instructions for the model. The products
// themselves ride in structuredContent; this text carries NO result data.
// ---------------------------------------------------------------------------

function narrate({ products }: SearchOutput): string {
  const size = products.length;

  if (size === 0) {
    return `\
No products found.

NEXT STEP: Broaden the keyword or relax filters, then search again.`;
  }

  // Small catalog: any relevant hit is renderable. Only widen if these clearly
  // miss the client's intent (e.g. a category with nothing for them).
  return `\
Results ready.

NEXT STEPS:
1. Curate the matches that fit the client's intent from the structured results. If none fit, search again with a broader keyword or drop the category.
2. Call render-carousel with the selected IDs (display order).
3. Only after it renders, write your recommendation in carousel order.`;
}

// ---------------------------------------------------------------------------
// Tool (registered from server.ts to keep the typed tool chain intact)
// ---------------------------------------------------------------------------

export const searchProductsDefinition = {
  name: "search-products" as const,

  description: `\
Search the Skybridge winter-sports catalog: skis, goggles, and cold-weather apparel. Handles any query: a specific product, a category, a gift, or open browsing. Never assume something is unavailable — always search before responding.

The response is data only: matching products (title, ID, "from" price, rating, badges, description, facts). The raw results are for your eyes only; the client never sees them. NEVER characterize the raw results to the client (how many, what categories). While searching, stay silent: do not narrate or announce searches. Speak only once the carousel is rendered.

Act on the response as follows:

- SEARCH: pass a keyword. Optionally scope with \`category\` (apparel, goggles, or skis) or \`sort\`. This is a small catalog — one focused search usually surfaces everything relevant (${MIN_SEARCH_ITERATIONS}+ calls).
- REFINEMENT: if the user narrows to a category, re-search with that \`category\`. If they change intent, search with a new keyword.
- CURATION: pick the best matches for the client's intent, grounding your choice in each product's description. If zero results, broaden the keyword and search again; do NOT call render-carousel on an empty set.
- PRESENT: once you have ${CAROUSEL_RANGE} distinct, relevant products, call render-carousel with their IDs. Recommend ONLY AFTER the carousel displays, in carousel order.

The sweet spot is ${CAROUSEL_RANGE} products.
`,
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
    destructiveHint: false,
  },

  _meta: {
    "openai/toolInvocation/invoking": "Searching the shop",
    "openai/toolInvocation/invoked": "Searched the shop",
  },

  inputSchema,
  outputSchema,
};

export async function searchProductsHandler(input: SearchInput) {
  const results = await search(input);
  return {
    structuredContent: results,
    content: [{ type: "text" as const, text: narrate(results) }],
    isError: false,
  };
}

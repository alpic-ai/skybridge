import { z } from "zod";
import {
  fetchSearch,
  fromPrice,
  readBadges,
  readNumber,
  readSpecs,
} from "../lib/medusa.js";
import { PriceSchema, SpecSchema } from "../types.js";

// Internal catalogue search and factual grounding used by shop.

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

const inputSchema = {
  keyword: z.string().describe(
    `\
Short noun phrases extracted from conversational input, matched against product titles, descriptions, and SKUs. Never pass full sentences. \
Include color or material descriptors when the user mentions them (e.g. "cyan skis", "fur hat"). \
This is a small winter-sports catalog: skis, goggles, and cold-weather apparel. For vague or broad requests use a plain category term.`,
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
  id: z
    .string()
    .describe("Stable product ID; pass to shop with action carousel."),
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

// Internal search helper: shop is the public search-and-present action.
export async function searchProductsHandler(input: SearchInput) {
  const results = await search(input);
  return { structuredContent: results };
}

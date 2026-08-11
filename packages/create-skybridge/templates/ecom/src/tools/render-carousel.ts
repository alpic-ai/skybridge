import { z } from "zod";
import { getProducts } from "../catalog/index.js";
import { CAROUSEL_MAX_SIZE, CAROUSEL_RANGE } from "../config.js";
import { PriceSchema, type Product, SpecSchema } from "../types.js";

// The `render-carousel` tool: takes the IDs the model curated and returns the
// matching products for the carousel view to render. Data access lives in
// `src/catalog/`; everything else this tool needs lives in this file.

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

const inputSchema = {
  ids: z
    .array(z.string())
    .min(1)
    .max(CAROUSEL_MAX_SIZE)
    .describe("Product IDs to present, in display order."),
};

type RenderInput = z.infer<z.ZodObject<typeof inputSchema>>;

// ---------------------------------------------------------------------------
// Output — model-facing grounding, for the LLM ONLY. The carousel view is NOT
// built from this; it renders from the full data in `_meta`. Keep it to what the
// model needs to reference and compare the displayed products afterward.
// ---------------------------------------------------------------------------

const outputSchema = {
  products: z
    .array(
      z.object({
        id: z.string().describe("Product SKU or reference."),
        title: z.string(),
        options: z
          .array(z.object({ label: z.string(), values: z.array(z.string()) }))
          .describe("Variations available (e.g. colors, sizes)."),
        description: z.string().optional(),
        price: PriceSchema.optional(),
        outOfStock: z.boolean(),
        specs: z
          .array(SpecSchema)
          .describe("Product-specific facts (material, dimensions, care…)."),
      }),
    )
    .describe(
      "The products shown in the carousel, in display order. For your reference only — to curate, compare, and answer follow-ups. Ground every claim in this data; never invent facts.",
    ),
};

type RenderOutput = z.infer<z.ZodObject<typeof outputSchema>>;

// ---------------------------------------------------------------------------
// Mapping: trim each product's `card` and `options` into the model-facing
// grounding (outputSchema), dropping presentational fields (media, url). The
// full data stays in `_meta` for the view.
// @todo: choose what the model sees per product. Grounding only: no
// presentational data (media, styling); that rides in `_meta` for the view.
// ---------------------------------------------------------------------------

function toStructuredContent(products: Product[]): RenderOutput {
  const groundingProducts: RenderOutput["products"] = [];

  for (const product of products) {
    const { card } = product;

    const options: { label: string; values: string[] }[] = [];
    for (const option of product.options) {
      const values: string[] = [];
      for (const value of option.values) {
        values.push(value.label);
      }
      options.push({ label: option.label, values });
    }

    groundingProducts.push({
      id: product.id,
      title: card.title,
      description: card.description,
      price: card.price,
      outOfStock: card.outOfStock ?? false,
      options,
      specs: card.specs,
    });
  }

  return { products: groundingProducts };
}

// ---------------------------------------------------------------------------
// Tool (registered from server.ts to keep the typed tool chain intact)
// ---------------------------------------------------------------------------

export const renderCarouselDefinition = {
  name: "render-carousel" as const,

  // @todo: adapt the wording to your catalog and brand voice (tone, vocabulary,
  // how to present products). The behavioral rules below apply to any catalog.
  description: `\
Display the products you curated as an inline carousel for the client.

## When to call
Call this AFTER searching and curating, and BEFORE writing your recommendation. Avoid describing the products in text first since the carousel shows them.

## What to pass
Pass the IDs of the ${CAROUSEL_RANGE} products you chose, in display order (most relevant first). Order is significant: the carousel shows them in this exact order and your recommendation must follow the same sequence. Pass distinct products, not several variants of the same one; the detail view lets the client explore a product's variants (colors, sizes, and so on).

## After the carousel
Recommend in carousel order so the client can follow along. The cards already show image, title, price, and key facts, so do not repeat them: add useful analysis tied to the client's need. Suggest a refinement the client has not addressed yet (from the available filters), never one they already used.

## Accuracy
Use only the data returned for each product. Never invent facts, materials, or availability. If the client asks about something not present, open that product's detail or search again before answering.`,
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
    destructiveHint: false,
  },

  // @todo: customize the status messages shown in ChatGPT while the tool runs.
  _meta: {
    "openai/toolInvocation/invoking": "Loading product carousel",
    "openai/toolInvocation/invoked": "Loaded product carousel",
  },

  // The carousel and product details UI rendered inline in the conversation.
  view: {
    // `as const` keeps this a literal (like `name` above) so it matches the
    // generated ViewNameRegistry; a bare string widens and fails the build.
    component: "carousel" as const,
    description: "Browse the curated products.",
    // @todo: declare the CSP domains this view needs. Add your image origins to
    // `resourceDomains` so product images load, and the product site to
    // `redirectDomains` so the detail view's "View on site" link and the host's
    // "Open in app" URL (useOpenExternal / setOpenInAppUrl) are allowed.
    // csp: {
    //   resourceDomains: ["https://images.example.com"],
    //   redirectDomains: ["https://www.example.com"],
    // },
  },

  inputSchema,
  outputSchema,
};

export async function renderCarouselHandler({ ids }: RenderInput) {
  const products = await getProducts(ids);

  return {
    // Full products (incl. variants) for the view; not in model context.
    _meta: { products },
    structuredContent: toStructuredContent(products),
    content: [
      {
        type: "text" as const,
        text: `Rendered ${products.length} product(s) in the carousel.`,
      },
    ],
    isError: false,
  };
}

import "../lib/load-env.js"; // ensure MEDUSA_BASE_URL is set before it's read below
import { z } from "zod";
import { CAROUSEL_MAX_SIZE, CAROUSEL_RANGE } from "../config.js";
import {
  COLOR_AXIS,
  currencyOf,
  fetchByIds,
  imagesForValues,
  priceOf,
  type RawProduct,
  type RawVariant,
  readBadges,
  readNumber,
  readSpecs,
  slug,
  variantValue,
} from "../lib/medusa.js";
import { type Price, PriceSchema, type Spec, SpecSchema } from "../types.js";

// The storefront every "View on site" CTA deep-links to (SPEC phase 3).
const STOREFRONT_URL = "https://skybridge.tech";

// Product images are served from the catalog backend origin (SPEC phase 2).
const IMAGE_HOST = process.env.MEDUSA_BASE_URL ?? "";

// The `render-carousel` tool: takes the IDs the model curated and returns the
// matching products for the carousel view to render.
// Everything this tool needs lives in this file.

// ---------------------------------------------------------------------------
// Product model
// ---------------------------------------------------------------------------
// Model: variant-as-full-product. Each `Variant` is a complete, buyable product
// (its own title, price, media). A `Product` ties sibling variants together and
// declares the axes (`Option`s) they vary on. A product with no variations is
// just a product with a single variant and no options.

// One selectable value on an axis, e.g. the "Black" choice on the "Color" axis.
type OptionValue = {
  id: string; // stable key referenced by Variant.selection, e.g. "black"
  label: string; // shown to the user, e.g. "Black"
  media?: string; // optional swatch / image representing this value
};

// A variation axis the variants differ on, e.g. Color or Size.
type Option = {
  id: string; // stable key, used as a key in Variant.selection, e.g. "color"
  label: string; // shown to the user, e.g. "Color"
  values: OptionValue[]; // in display order
};

// Display fields shared by a Variant and by a product's `card`.
type Meta = {
  title: string;
  description?: string;
  price?: Price;
  media: string[]; // images for this item; media[0] is the primary/cover
  url?: string; // link to this item's external product page
  outOfStock?: boolean; // true = not purchasable
  // Objective, product-specific facts (material, dimensions, capacity, care…),
  // rendered as-is. Each fact's label is optional.
  specs: Spec[];

  // Custom fields (from Medusa metadata): rating → stars, badges → chips.
  rating?: number; // average review rating, 0–5
  reviewCount?: number;
  badges?: string[]; // e.g. ["Bestseller"], ["New"]
};

// One buyable product: full display Meta plus which value it takes on each axis.
export type Variant = Meta & {
  id: string; // SKU / article number; unique within the catalog
  // The chosen value per axis: keys are Option.id, values are OptionValue.id.
  // e.g. { color: "black", size: "40" }
  selection: Record<string, string>;
};

// A product: one carousel card backed by one or more variants and the axes they
// vary on (none for a single-variant product).
export type Product = {
  id: string; // stable product key
  // The axes the variants vary on, in display order. Order is semantic: the
  // detail picker narrows availability top-down (each axis constrained by the
  // ones before it), so put the imagery-driving axis (usually color) first.
  options: Option[];
  // Only the variants that actually exist. A missing combination (e.g. no
  // { color: "black", size: "40" }) is simply absent from this list — that is how
  // contingent variations are expressed. Derive the selectable values for an axis
  // by filtering this list on the choices already made.
  variants: Variant[];
  // The product's carousel card. Surfaced both in the carousel (the view
  // renders it) and to the model (structuredContent is projected from it).
  // How you build it depends on your mapping strategy: see getProducts.
  card: Meta;
};

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
        id: z.string().describe("Product ID."),
        title: z.string(),
        options: z
          .array(z.object({ label: z.string(), values: z.array(z.string()) }))
          .describe("Variations available (e.g. colors, sizes)."),
        description: z.string().optional(),
        price: PriceSchema.optional().describe('"From" price (cheapest variant).'),
        rating: z.number().optional().describe("Average review rating, 0–5."),
        reviewCount: z.number().optional(),
        badges: z.array(z.string()).optional().describe('e.g. "Bestseller".'),
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
// Data access
// ---------------------------------------------------------------------------

// Grouped strategy: one carousel card per Medusa product; the detail view lets
// the client switch between its variants. `card` is the "from" union of the
// product's variants. Images are color-filtered per variant (D4 heuristic).

// Options with the Color axis first (imagery-driving; order is semantic).
function mapOptions(p: RawProduct): Option[] {
  const options = (p.options ?? []).map((o) => ({
    id: slug(o.title),
    label: o.title,
    values: o.values.map((val) => ({
      id: slug(val.value),
      label: val.value,
      // Color values get a representative image as a swatch (no swatch data
      // exists; reuse the color-matched product photo).
      media:
        o.title === COLOR_AXIS
          ? imagesForValues(p.images, [val.value])[0]
          : undefined,
    })),
  }));
  return options.sort((a, b) =>
    a.label === COLOR_AXIS ? -1 : b.label === COLOR_AXIS ? 1 : 0,
  );
}

function mapVariant(p: RawProduct, v: RawVariant): Variant {
  const amount = priceOf(v);
  const selection: Record<string, string> = {};
  for (const opt of p.options ?? []) {
    const value = variantValue(v, opt.title);
    if (value) selection[slug(opt.title)] = slug(value);
  }
  return {
    id: v.id,
    title: p.title, // detail header stays the product identity; pickers show the variant
    description: p.description ?? undefined,
    price: amount != null ? { amount, currency: currencyOf(v) } : undefined,
    // Color-filtered images (D4); matches any option value incl. material.
    media: imagesForValues(p.images, v.options.map((o) => o.value)),
    url: STOREFRONT_URL,
    outOfStock: false, // no stock signal in the data — never lock the CTA
    specs: readSpecs(v.metadata),
    rating: readNumber(v.metadata, "rating") ?? readNumber(p.metadata, "rating"),
    reviewCount:
      readNumber(v.metadata, "review_count") ??
      readNumber(p.metadata, "review_count"),
    badges: readBadges(p.metadata),
    selection,
  };
}

function mapProduct(p: RawProduct): Product {
  const variants = (p.variants ?? []).map((v) => mapVariant(p, v));
  const prices = variants
    .map((v) => v.price?.amount)
    .filter((n): n is number => typeof n === "number");
  const thumbFirst = [
    ...(p.thumbnail ? [p.thumbnail] : []),
    ...(p.images ?? []).map((i) => i.url).filter((u) => u !== p.thumbnail),
  ];
  const card: Meta = {
    title: p.title,
    description: p.description ?? undefined,
    price: prices.length
      ? { amount: Math.min(...prices), currency: "EUR" }
      : undefined,
    media: thumbFirst,
    url: STOREFRONT_URL,
    outOfStock: false,
    specs: readSpecs(p.variants?.[0]?.metadata),
    rating: readNumber(p.metadata, "rating"),
    reviewCount: readNumber(p.metadata, "review_count"),
    badges: readBadges(p.metadata),
  };
  return { id: p.id, options: mapOptions(p), variants, card };
}

async function getProducts(ids: string[]): Promise<Product[]> {
  const raw = await fetchByIds(ids);
  return raw.map(mapProduct);
}

// ---------------------------------------------------------------------------
// Mapping: trim each product's `card` and `options` into the model-facing
// grounding (outputSchema), dropping presentational fields (media, url). The
// full data stays in `_meta` for the view. Grounding = id, title, price,
// rating, reviewCount, badges, options, specs — enough to compare and answer.
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
      rating: card.rating,
      reviewCount: card.reviewCount,
      badges: card.badges,
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

  description: `\
Display the Skybridge products you curated as an inline carousel for the client.

## When to call
Call this AFTER searching and curating, and BEFORE writing your recommendation. Do not describe the products in text first; the carousel shows them. Stay silent until it has rendered, then speak.

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

  _meta: {
    "openai/toolInvocation/invoking": "Loading products",
    "openai/toolInvocation/invoked": "Loaded products",
  },

  // The carousel and product details UI rendered inline in the conversation.
  view: {
    // `as const` keeps this a literal (like `name` above) so it matches the
    // generated ViewNameRegistry; a bare string widens and fails the build.
    component: "carousel" as const,
    description: "Browse the curated products.",
    csp: {
      resourceDomains: [
        // Catalog image host (product photos), from MEDUSA_BASE_URL.
        IMAGE_HOST,
        // Google Fonts: stylesheet host + woff2 host (Mozilla Text brand font).
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
      ].filter(Boolean),
      // Storefront the detail CTA / "open in app" link points at.
      redirectDomains: [STOREFRONT_URL],
    },
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

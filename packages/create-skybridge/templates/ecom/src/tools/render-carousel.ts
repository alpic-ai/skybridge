import { z } from "zod";
import { CAROUSEL_MAX_SIZE, CAROUSEL_RANGE } from "../config.js";
import {
  type Attribute,
  AttributeSchema,
  type Price,
  PriceSchema,
} from "../types.js";

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
  // Facts to display: spec rows, promo labels, etc.
  attributes: Attribute[];
};

// One buyable product: full display Meta plus which value it takes on each axis.
type Variant = Meta & {
  id: string; // SKU / article number; unique within the catalog
  // The chosen value per axis: keys are Option.id, values are OptionValue.id.
  // e.g. { color: "black", size: "40" }
  selection: Record<string, string>;
};

// A product: one carousel card backed by one or more variants and the axes they
// vary on (none for a single-variant product).
type Product = {
  id: string; // stable product key
  options: Option[]; // the axes the variants vary on
  // Only the variants that actually exist. A missing combination (e.g. no
  // { color: "black", size: "40" }) is simply absent from this list — that is how
  // contingent variations are expressed. Derive the selectable values for an axis
  // by filtering this list on the choices already made.
  variants: Variant[];
  // What the carousel card shows for the whole product. Optional: when omitted, the
  // first variant is used. Set it to showcase a specific variant or give the product
  // its own title/price, e.g. a "from" price spanning the variants.
  card?: Meta;
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
        id: z.string().describe("Product SKU or reference."),
        title: z.string(),
        options: z
          .array(z.object({ label: z.string(), values: z.array(z.string()) }))
          .describe("Variations available (e.g. colors, sizes)."),
        description: z.string().optional(),
        price: PriceSchema.optional(),
        outOfStock: z.boolean(),
        attributes: z
          .array(AttributeSchema)
          .describe("Product facts (specs, promo labels…)."),
      }),
    )
    .describe(
      "The products shown in the carousel, in display order. For your reference only — to curate, compare, and answer follow-ups. Ground every claim in this data; never invent attributes.",
    ),
};

type RenderOutput = z.infer<z.ZodObject<typeof outputSchema>>;

// ---------------------------------------------------------------------------
// Data access
// ---------------------------------------------------------------------------

async function getProducts(_ids: string[]): Promise<Product[]> {
  // @todo: fetch each id from your product API / DB and map the results into
  // `Product`s (rename `_ids` -> `ids` once you use it).
  //
  // First decide your mapping strategy — it depends on your catalog:
  //   - no variants (simple products): one `Product`, a single variant, options: []
  //   - grouped: one `Product` per product; `card` = union of its variants, one picture per requested variant
  //   - one card per requested variant: `card` = that variant
  // Either way, set `variants` to ALL variants the source returns for the product;
  // the detail view reads them so the client can switch variant.
  //
  // Returns [] for now, so the carousel is empty.
  return [];
}

// ---------------------------------------------------------------------------
// Mapping — trim products to the model-facing grounding (outputSchema). The full
// data stays in `_meta` for the view. The card, else the first variant,
// represents the product; options collapse to label + value labels.
// @todo: choose what the model sees per product. Grounding only — no
// presentational data (media, styling); that rides in `_meta` for the view.
// ---------------------------------------------------------------------------

function toStructuredContent(products: Product[]): RenderOutput {
  const groundingProducts: RenderOutput["products"] = [];

  for (const product of products) {
    const rep = product.card ?? product.variants[0];

    let outOfStock = true;
    for (const variant of product.variants) {
      if (!variant.outOfStock) {
        outOfStock = false;
        break;
      }
    }

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
      title: rep.title,
      description: rep.description,
      price: rep.price,
      outOfStock,
      options,
      attributes: rep.attributes,
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
Call this AFTER searching and curating, and BEFORE writing your recommendation. Do not describe the products in text first; the carousel shows them. Stay silent until it has rendered, then speak.

## What to pass
Pass the IDs of the ${CAROUSEL_RANGE} products you chose, in display order (most relevant first). Order is significant: the carousel shows them in this exact order and your recommendation must follow the same sequence. Pass distinct products, not several variants of the same one; the detail view lets the client explore a product's variants (colors, sizes, and so on).

## After the carousel
Recommend in carousel order so the client can follow along. The cards already show image, title, price, and key facts, so do not repeat them: add useful analysis tied to the client's need. Suggest a refinement the client has not addressed yet (from the available filters), never one they already used.

## Accuracy
Use only the data returned for each product. Never invent attributes, materials, or availability. If the client asks about something not present, open that product's detail or search again before answering.`,
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

  // The carousel view rendered inline in the conversation.
  view: {
    // `as const` keeps this a literal (like `name` above) so it matches the
    // generated ViewNameRegistry; a bare string widens and fails the build.
    component: "carousel" as const,
    description: "Browse the curated products.",
  },

  inputSchema,
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

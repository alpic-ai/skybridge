import { z } from "zod";

export const PriceSchema = z.object({
  amount: z.number(),
  currency: z.string(),
});
export type Price = z.infer<typeof PriceSchema>;

// A product-specific fact (an objective spec: material, dimensions, capacity,
// care…). `label` is optional so a fact can be a bare value (e.g. "Waterproof").
export const SpecSchema = z.object({
  label: z.string().optional(),
  value: z.string(),
});
export type Spec = z.infer<typeof SpecSchema>;

// ---------------------------------------------------------------------------
// Product model — what the catalog providers in `src/catalog/` return and the
// views render. Model: variant-as-full-product. Each `Variant` is a complete,
// buyable product (its own title, price, media). A `Product` ties sibling
// variants together and declares the axes (`Option`s) they vary on. A product
// with no variations is just a product with a single variant and no options.
// ---------------------------------------------------------------------------

// One selectable value on an axis, e.g. the "Black" choice on the "Color" axis.
type OptionValue = {
  id: string; // stable key referenced by Variant.selection, e.g. "black"
  label: string; // shown to the user, e.g. "Black"
  media?: string; // optional swatch / image representing this value
};

// A variation axis the variants differ on, e.g. Color or Size.
export type Option = {
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

  // @todo: Add whatever custom fields the carousel should render as real types
  // (e.g. `rating` → stars, `discountPct` → badge, `badges` → chips).
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
  card: Meta;
};

// What a catalog provider's `search` returns. `pages` and `totalHits` are
// optional: not every backend reports them.
export type SearchResult = {
  products: Product[];
  pages?: { current: number; total: number };
  totalHits?: number;
};

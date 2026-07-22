import type { Product } from "../../../tools/render-carousel.js";
import { DetailView } from "./index";

function shot(fill: string) {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23${fill}'/%3E%3Ccircle cx='200' cy='200' r='110' fill='%23ffffff' fill-opacity='0.5'/%3E%3C/svg%3E`;
}

// A long media set (primary shot + several accents) so the desktop thumbnail
// rail is taller than the image and overflows past its bottom.
const ACCENT_FILLS = [
  "c9d4f5",
  "f5d4c9",
  "d4f5c9",
  "f5f0c9",
  "e0c9f5",
  "c9f5f0",
  "f5c9e0",
  "d9d9d9",
];

function galleryMedia(primaryFill: string): string[] {
  const media = [shot(primaryFill)];
  for (const fill of ACCENT_FILLS) {
    media.push(shot(fill));
  }
  return media;
}

const DESCRIPTION =
  "A relaxed-fit jacket in water-repellent cotton.\n\nDropped shoulders, a two-way zip, and ribbed cuffs. Fully lined, with two zip pockets at the front and one inside.";

// One story, every picker behavior:
// - Hole in the matrix: {sand,L} does not exist, so under Sand, L is
//   hard-disabled; switching to Sand while L is selected snaps Size to M.
// - Sold out: {black,L} renders struck but selectable; the CTA locks as
//   "Out of stock".
// - Axis not applicable: the indigo colorway is one-size (no `size` key), so
//   choosing "Indigo" hides the Size row; indigo resolves and stays buyable.
function jacket(
  id: string,
  color: string,
  colorLabel: string,
  size: string | null,
  outOfStock = false,
): Product["variants"][number] {
  const fill =
    color === "sand" ? "d8c7a8" : color === "indigo" ? "3f4a8a" : "2b2b2b";
  return {
    id,
    selection: size == null ? { color } : { color, size },
    title: `Field jacket — ${colorLabel}`,
    description: DESCRIPTION,
    price: { amount: color === "black" ? 229 : 249, currency: "EUR" },
    media: galleryMedia(fill),
    url: "https://example.com/jacket",
    outOfStock,
    specs: [
      { label: "Material", value: "Water-repellent cotton" },
      { label: "Fit", value: "Relaxed" },
      { value: "Machine washable" }, // label-less fact (renders value only)
    ],
  };
}

const PRODUCT: Product = {
  id: "field-jacket",
  options: [
    {
      id: "color",
      label: "Color",
      values: [
        { id: "black", label: "Black", media: shot("2b2b2b") },
        { id: "sand", label: "Sand", media: shot("d8c7a8") },
        { id: "indigo", label: "Indigo", media: shot("3f4a8a") },
      ],
    },
    {
      id: "size",
      label: "Size",
      values: [
        { id: "m", label: "M" },
        { id: "l", label: "L" },
      ],
    },
  ],
  variants: [
    jacket("fj-black-m", "black", "Black", "m"),
    jacket("fj-black-l", "black", "Black", "l", true),
    jacket("fj-sand-m", "sand", "Sand", "m"),
    jacket("fj-indigo", "indigo", "Indigo", null),
  ],
  card: {
    title: "Field jacket",
    price: { amount: 229, currency: "EUR" },
    media: [shot("2b2b2b")],
    specs: [],
  },
};

export const Default = () => <DetailView product={PRODUCT} />;

// Single-variant product: no picker, buyable immediately.
const SIMPLE: Product = {
  id: "tote",
  options: [],
  variants: [
    {
      id: "tote",
      selection: {},
      title: "Canvas tote",
      description: "A sturdy everyday canvas tote.",
      price: { amount: 39, currency: "EUR" },
      media: [shot("e1e1e1")],
      url: "https://example.com/tote",
      specs: [{ label: "Material", value: "Canvas" }],
    },
  ],
  card: {
    title: "Canvas tote",
    price: { amount: 39, currency: "EUR" },
    media: [shot("e1e1e1")],
    specs: [],
  },
};

export const SingleVariant = () => <DetailView product={SIMPLE} />;

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

// Two axes with a sparse variant set: {black,M}, {black,L}, {sand,M} exist —
// so choosing "Sand" disables "L".
function jacket(
  id: string,
  color: string,
  colorLabel: string,
  size: string,
): Product["variants"][number] {
  return {
    id,
    selection: { color, size },
    title: `Field jacket — ${colorLabel}`,
    description: DESCRIPTION,
    price: { amount: color === "sand" ? 249 : 229, currency: "EUR" },
    media: galleryMedia(color === "sand" ? "d8c7a8" : "2b2b2b"),
    url: "https://example.com/jacket",
    attributes: [
      { name: "Material", value: "Water-repellent cotton" },
      { name: "Fit", value: "Relaxed" },
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
    jacket("fj-black-l", "black", "Black", "l"),
    jacket("fj-sand-m", "sand", "Sand", "m"),
  ],
  card: {
    title: "Field jacket",
    price: { amount: 229, currency: "EUR" },
    media: [shot("2b2b2b")],
    attributes: [],
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
      attributes: [{ name: "Material", value: "Canvas" }],
    },
  ],
  card: {
    title: "Canvas tote",
    price: { amount: 39, currency: "EUR" },
    media: [shot("e1e1e1")],
    attributes: [],
  },
};

export const SingleVariant = () => <DetailView product={SIMPLE} />;

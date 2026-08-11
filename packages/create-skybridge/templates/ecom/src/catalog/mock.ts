import type { SearchInput } from "../tools/search-products.js";
import type { Product, SearchResult, Spec } from "../types.js";

// Placeholder catalog provider, so both tools answer before a backend exists.
// Images are inline SVG placeholders, so no CSP domain is needed.
// @todo: delete this module once you point `./index.js` at a real provider.

function shot(fill: string): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23${fill}'/%3E%3C/svg%3E`;
}

const JACKET_SPECS: Spec[] = [
  { label: "Material", value: "Water-repellent cotton" },
  { label: "Fit", value: "Relaxed" },
];

// Deliberately long, to exercise the detail page's scroll and "read more".
const JACKET_DESCRIPTION = "Relaxed-fit jacket in water-repellent cotton.";

const MOCK_PRODUCTS: Product[] = [
  {
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
    ],
    variants: [
      {
        id: "fj-black",
        selection: { color: "black" },
        title: "Field jacket — Black",
        description: JACKET_DESCRIPTION,
        price: { amount: 229, currency: "EUR" },
        media: [shot("2b2b2b")],
        url: "https://example.com/field-jacket-black",
        specs: JACKET_SPECS,
      },
      {
        id: "fj-sand",
        selection: { color: "sand" },
        title: "Field jacket — Sand",
        description: JACKET_DESCRIPTION,
        price: { amount: 249, currency: "EUR" },
        media: [shot("d8c7a8")],
        url: "https://example.com/field-jacket-sand",
        specs: JACKET_SPECS,
      },
    ],
    card: {
      title: "Field jacket",
      description: "Relaxed-fit jacket in water-repellent cotton.",
      price: { amount: 229, currency: "EUR" },
      media: [shot("2b2b2b")],
      specs: JACKET_SPECS,
    },
  },
  {
    id: "canvas-tote",
    options: [],
    variants: [
      {
        id: "canvas-tote",
        selection: {},
        title: "Canvas tote",
        description: "Sturdy everyday tote with an inner pocket.",
        price: { amount: 39, currency: "EUR" },
        media: [shot("e1e1e1")],
        url: "https://example.com/canvas-tote",
        specs: [{ label: "Material", value: "Cotton canvas" }],
      },
    ],
    card: {
      title: "Canvas tote",
      description: "Sturdy everyday tote with an inner pocket.",
      price: { amount: 39, currency: "EUR" },
      media: [shot("e1e1e1")],
      specs: [{ label: "Material", value: "Cotton canvas" }],
    },
  },
  {
    id: "wool-beanie",
    options: [],
    variants: [
      {
        id: "wool-beanie",
        selection: {},
        title: "Wool beanie",
        description: "Ribbed merino beanie with a folded brim.",
        price: { amount: 45, currency: "EUR" },
        media: [shot("6b7f9e")],
        url: "https://example.com/wool-beanie",
        outOfStock: true,
        specs: [{ label: "Material", value: "Merino wool" }],
      },
    ],
    card: {
      title: "Wool beanie",
      description: "Ribbed merino beanie with a folded brim.",
      price: { amount: 45, currency: "EUR" },
      media: [shot("6b7f9e")],
      outOfStock: true,
      specs: [{ label: "Material", value: "Merino wool" }],
    },
  },
];

// Ignores the input: every mock product matches every query.
export async function search(_input: SearchInput): Promise<SearchResult> {
  return {
    products: MOCK_PRODUCTS,
    pages: { current: 1, total: 1 },
    totalHits: MOCK_PRODUCTS.length,
  };
}

// Requested order is the display order, so resolve by id, not catalog order.
export async function getProducts(ids: string[]): Promise<Product[]> {
  const products: Product[] = [];
  for (const id of ids) {
    for (const product of MOCK_PRODUCTS) {
      if (product.id === id) {
        products.push(product);
        break;
      }
    }
  }
  return products;
}

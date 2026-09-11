export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
}

const CATALOG: Product[] = [
  {
    id: "goggles-aurora",
    name: "Aurora Ski Goggles",
    category: "goggles",
    price: 120,
    inStock: true,
  },
  {
    id: "goggles-whiteout",
    name: "Whiteout Ski Goggles",
    category: "goggles",
    price: 85,
    inStock: true,
  },
  {
    id: "goggles-summit",
    name: "Summit Pro Goggles",
    category: "goggles",
    price: 240,
    inStock: false,
  },
  {
    id: "gloves-tundra",
    name: "Tundra Gloves",
    category: "gloves",
    price: 60,
    inStock: true,
  },
  {
    id: "helmet-cirrus",
    name: "Cirrus Helmet",
    category: "helmets",
    price: 150,
    inStock: true,
  },
];

export function searchProducts(category: string, maxPrice?: number): Product[] {
  return CATALOG.filter(
    (product) =>
      product.category === category.toLowerCase() &&
      (maxPrice === undefined || product.price <= maxPrice),
  );
}

export function getProduct(id: string): Product | undefined {
  return CATALOG.find((product) => product.id === id);
}

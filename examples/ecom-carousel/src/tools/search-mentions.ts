import { ResourceTemplate } from "@modelcontextprotocol/server";
import type { McpServer } from "skybridge/server";
import { fetchSearch } from "../lib/medusa.js";
import { getProducts, type Product } from "./render-carousel.js";

const productUri = (id: string) =>
  `product://catalog/${encodeURIComponent(id)}`;
function mentionItems(products: Product[]) {
  return products.map((p) => ({
    type: "resource_link" as const,
    uri: productUri(p.id),
    name: p.card.title,
    description: p.card.description ?? "Skybridge winter-sports product",
    mimeType: "application/json",
    ...(p.card.media[0]?.startsWith("https://")
      ? { icons: [{ src: p.card.media[0] }] }
      : {}),
  }));
}
export const mentionsConfig = {
  name: "search-mentions",
  description: "Find factual catalogue products for composer mentions.",
  handler: async ({ query }: { query: string }) => {
    const { products: matches } = await fetchSearch({ keyword: query });
    const products = await getProducts(matches.slice(0, 20).map((p) => p.id));
    return { items: mentionItems(products) };
  },
};
export function registerProductResources(server: McpServer) {
  server.registerResource(
    "catalog-product",
    new ResourceTemplate("product://catalog/{id}", { list: undefined }),
    {
      mimeType: "application/json",
      description:
        "Factual product details and available variants from the live catalogue.",
    },
    async (uri, variables) => {
      if (typeof variables.id !== "string") {
        throw new Error("Invalid product identifier.");
      }
      const products = await getProducts([variables.id]);
      if (!products[0]) {
        throw new Error("Product not found.");
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(products[0]),
          },
        ],
      };
    },
  );
}

import { McpServer } from "skybridge/server";
import { z } from "zod";
import { products } from "./products.js";

interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: {
    rate: number;
    count: number;
  };
}

const server = new McpServer(
  {
    name: "ecom-carousel-app",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerWidget(
  "ecom-carousel",
  {
    description: "E-commerce Product Carousel",
    _meta: {
      ui: {
        csp: {
          resourceDomains: ["https://fakestoreapi.com"],
          redirectDomains: [
            "https://docs.skybridge.tech",
            "https://github.com/alpic-ai/skybridge/issues/248",
          ],
        },
      },
    },
  },
  {
    description: "Display a carousel of products from the store.",
    inputSchema: {
      category: z
        .enum(["electronics", "jewelery", "men's clothing", "women's clothing"])
        .optional()
        .describe("Filter by product category"),
      maxPrice: z.number().optional().describe("Maximum price filter"),
    },
  },
  ({ category, maxPrice }) => {
    try {
      const filtered: Product[] = [];

      for (const product of products) {
        if (category && product.category !== category) {
          continue;
        }
        if (maxPrice !== undefined && product.price > maxPrice) {
          continue;
        }
        filtered.push(product);
      }

      return {
        structuredContent: { products: filtered },
        content: [{ type: "text", text: JSON.stringify(filtered) }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error}` }],
        isError: true,
      };
    }
  },
);

export default server;
export type AppType = typeof server;

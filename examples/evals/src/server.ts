import { Skybridge } from "skybridge/server";
import * as z from "zod";
import { getProduct, searchProducts } from "./products.js";

export const app = new Skybridge({
  name: "skybridge-evals",
  version: "0.0.1",
  handler: (server) =>
    server
      .registerTool(
        {
          name: "search-products",
          description:
            "Search the ski shop catalog by category. Use this whenever the user asks what is available, what you sell, or looks for a kind of gear. Categories are 'goggles', 'gloves' and 'helmets'.",
          inputSchema: {
            category: z
              .string()
              .describe("Product category: goggles, gloves or helmets"),
            maxPrice: z
              .number()
              .optional()
              .describe("Only return products at or below this price, in EUR"),
          },
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
          },
        },
        ({ category, maxPrice }) => {
          const results = searchProducts(category, maxPrice);

          return {
            structuredContent: { products: results },
            content: [
              {
                type: "text",
                text:
                  results.length === 0
                    ? `No products found in "${category}".`
                    : results
                        .map(
                          (product) =>
                            `${product.id}: ${product.name}, ${product.price} EUR, ${product.inStock ? "in stock" : "out of stock"}`,
                        )
                        .join("\n"),
              },
            ],
            isError: false,
          };
        },
      )
      .registerTool(
        {
          name: "product-details",
          description:
            "Get the full details of one product by its id. Call search-products first to find the id.",
          inputSchema: {
            id: z.string().describe("Product id, for example 'goggles-aurora'"),
          },
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
          },
        },
        ({ id }) => {
          const product = getProduct(id);

          if (product === undefined) {
            return {
              content: [{ type: "text", text: `No product with id "${id}".` }],
              isError: true,
            };
          }

          return {
            structuredContent: { product },
            content: [
              {
                type: "text",
                text: `${product.name} costs ${product.price} EUR and is ${product.inStock ? "in stock" : "out of stock"}.`,
              },
            ],
            isError: false,
          };
        },
      )
      .registerTool(
        {
          name: "create-checkout",
          description:
            "Start a checkout for one product. The user must be signed in.",
          inputSchema: {
            id: z.string().describe("Product id to buy"),
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
          },
        },
        ({ id }, extra) => {
          const email = extra.http?.authInfo?.extra?.email;

          if (typeof email !== "string") {
            return {
              content: [
                {
                  type: "text",
                  text: "Sign in before starting a checkout.",
                },
              ],
              isError: true,
            };
          }

          return {
            structuredContent: { checkoutId: `co_${id}`, email },
            content: [
              { type: "text", text: `Checkout co_${id} opened for ${email}.` },
            ],
            isError: false,
          };
        },
      )
      .registerTool(
        {
          name: "clear-cart",
          description:
            "Empty the user's cart. Only call this when the user explicitly asks to empty or reset their cart.",
          inputSchema: {},
          annotations: {
            readOnlyHint: false,
            destructiveHint: true,
          },
        },
        () => ({
          content: [{ type: "text", text: "Cart cleared." }],
          isError: false,
        }),
      ),
});

export type AppType = typeof app;

import { McpServer } from "skybridge/server";
import { z } from "zod";
import { products } from "./products.js";
import { stripe } from "./stripe.js";

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
)
  .registerTool(
    {
      name: "browse-catalog",
      description: "Display a carousel of products from the store.",
      inputSchema: {
        category: z
          .enum([
            "electronics",
            "jewelery",
            "men's clothing",
            "women's clothing",
          ])
          .optional()
          .describe("Filter by product category"),
        maxPrice: z.number().optional().describe("Maximum price filter"),
      },
      view: {
        component: "browse-catalog",
        description: "E-commerce Product Carousel",
        csp: {
          resourceDomains: ["https://fakestoreapi.com"],
          redirectDomains: [
            "https://docs.skybridge.tech",
            "https://checkout.stripe.com",
          ],
        },
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
  )
  .registerTool(
    {
      name: "create-checkout",
      description:
        "Create a Stripe Checkout session for the selected products and return the checkout URL.",
      inputSchema: {
        productIds: z
          .array(z.number())
          .describe("Product IDs to include in the checkout"),
      },
      annotations: {
        readOnlyHint: false,
        openWorldHint: true,
      },
    },
    async ({ productIds }) => {
      try {
        const lineItems = productIds
          .map((id) => products.find((p) => p.id === id))
          .filter((p): p is Product => p !== undefined)
          .map((p) => ({
            price_data: {
              currency: "usd",
              product_data: { name: p.title },
              unit_amount: Math.round(p.price * 100),
            },
            quantity: 1,
          }));

        if (lineItems.length === 0) {
          return {
            content: [
              { type: "text", text: "Error: no valid products in the cart" },
            ],
            isError: true,
          };
        }

        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          line_items: lineItems,
          success_url: "https://docs.skybridge.tech",
          cancel_url: "https://docs.skybridge.tech",
        });

        return {
          structuredContent: {
            checkoutUrl: session.url,
            sessionId: session.id,
          },
          content: [
            {
              type: "text",
              text: `Checkout session created: ${session.url}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error}` }],
          isError: true,
        };
      }
    },
  )
  .registerTool(
    {
      name: "check-checkout-status",
      description:
        "Check the status of a Stripe Checkout session. Returns open, complete, or expired.",
      inputSchema: {
        sessionId: z.string().describe("The Stripe Checkout Session ID"),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async ({ sessionId }) => {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        return {
          structuredContent: {
            status: session.status,
            paymentStatus: session.payment_status,
          },
          content: [
            {
              type: "text",
              text: `Checkout session ${sessionId}: status=${session.status}, payment=${session.payment_status}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error}` }],
          isError: true,
        };
      }
    },
  );

server.run();

export type AppType = typeof server;

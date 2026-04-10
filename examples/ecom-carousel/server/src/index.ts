import "dotenv/config";
import { McpServer } from "skybridge/server";
import Stripe from "stripe";
import { z } from "zod";
import { products } from "./products.js";

const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}
const stripe = new Stripe(apiKey);

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
  .registerWidget(
    "browse-catalog",
    {
      description: "E-commerce Product Carousel",
      _meta: {
        ui: {
          csp: {
            resourceDomains: ["https://fakestoreapi.com"],
            redirectDomains: [
              "https://docs.skybridge.tech",
              "https://checkout.stripe.com",
            ],
          },
        },
      },
    },
    {
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
    "create-checkout",
    {
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

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: lineItems,
        success_url: "https://docs.skybridge.tech",
      });

      return {
        structuredContent: {
          checkoutUrl: session.url,
          sessionId: session.id,
        },
        content: [
          {
            type: "text" as const,
            text: `Checkout session created: ${session.url}`,
          },
        ],
      };
    },
  )
  .registerTool(
    "check-checkout-status",
    {
      description:
        "Check the status of a Stripe Checkout session. Returns open, complete, or expired.",
      inputSchema: {
        sessionId: z.string().describe("The Stripe Checkout Session ID"),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async ({ sessionId }) => {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      return {
        structuredContent: {
          status: session.status,
          paymentStatus: session.payment_status,
        },
        content: [
          {
            type: "text" as const,
            text: `Checkout session ${sessionId}: status=${session.status}, payment=${session.payment_status}`,
          },
        ],
      };
    },
  );

server.run();

export type AppType = typeof server;

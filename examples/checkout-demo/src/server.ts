import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import express from "express";
import { z } from "zod";
import {
  type CheckoutItem,
  getCheckoutSession,
  getMockProducts,
  getProducts,
} from "./lib/stripe.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "..", "dist");

const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const USE_MOCK = !process.env.STRIPE_SECRET_KEY;

// Read the built HTML file and inject absolute URLs
const rawHtml = readFileSync(
  join(distDir, "src/widgets/list_products.html"),
  "utf-8",
);
const widgetHtml = rawHtml
  .replace(/src="\/assets/g, `src="${BASE_URL}/assets`)
  .replace(/href="\/assets/g, `href="${BASE_URL}/assets`);

const server = new McpServer({
  name: "stripe-monetization-demo",
  version: "0.0.1",
});

const WIDGET_URI = "ui://widgets/list_products.html";

// Register the widget resource
server.resource(
  "list_products-widget",
  WIDGET_URI,
  {
    description: "Products listing widget",
    mimeType: "text/html",
  },
  async () => ({
    contents: [{ uri: WIDGET_URI, mimeType: "text/html", text: widgetHtml }],
  }),
);

// Tool: List products
server.registerTool(
  "list_products",
  {
    description: "List the products available for purchase",
    annotations: { readOnlyHint: true },
    _meta: {
      "openai/outputTemplate": WIDGET_URI,
      "ui/resourceUri": WIDGET_URI,
    },
  },
  async () => {
    const products = USE_MOCK ? getMockProducts() : await getProducts();
    if (USE_MOCK) console.log("Using mock products");

    return {
      content: [{ type: "text" as const, text: widgetHtml }],
      structuredContent: { products },
    };
  },
);

// Tool: Buy products
server.registerTool(
  "buy_products",
  {
    description:
      "Create a checkout page link for purchasing the selected products",
    inputSchema: {
      items: z
        .array(
          z.object({
            priceId: z.string().describe("The Stripe price ID"),
            quantity: z.number().int().min(1).describe("Quantity"),
          }),
        )
        .min(1)
        .describe("Line items to checkout"),
    },
    _meta: { "openai/widgetAccessible": true },
  },
  async ({ items }: { items: CheckoutItem[] }) => {
    if (USE_MOCK) {
      const mockUrl = `https://checkout.stripe.com/mock?items=${encodeURIComponent(JSON.stringify(items))}`;
      return {
        content: [
          { type: "text" as const, text: `[Checkout](${mockUrl}) (mock)` },
        ],
        structuredContent: {
          checkoutSessionId: `cs_mock_${Date.now()}`,
          checkoutSessionUrl: mockUrl,
        },
      };
    }

    try {
      const session = await getCheckoutSession(items);
      return {
        content: [
          { type: "text" as const, text: `[Checkout](${session.url})` },
        ],
        structuredContent: {
          checkoutSessionId: session.id,
          checkoutSessionUrl: session.url,
        },
      };
    } catch (error) {
      console.error("Checkout failed", error);
      return {
        content: [
          { type: "text" as const, text: "Checkout failed. Try again." },
        ],
        structuredContent: {},
        isError: true,
      };
    }
  },
);

// Express server
const app = express();
app.use(cors());
app.use(express.json());

// Serve static assets from dist
app.use("/assets", express.static(distDir));

// Stripe redirect pages
app.get("/success", (_req, res) => res.send("<h1>Payment Successful!</h1>"));
app.get("/cancel", (_req, res) => res.send("<h1>Payment Cancelled</h1>"));

// MCP endpoint
const transports = new Map<string, StreamableHTTPServerTransport>();

app.all("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport = sessionId ? transports.get(sessionId) : undefined;

  if (!transport && (req.method === "POST" || req.method === "GET")) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports.set(id, transport as StreamableHTTPServerTransport);
      },
      onsessionclosed: (id) => {
        transports.delete(id);
      },
    });
    await server.connect(transport);
  }

  if (!transport) {
    res.status(400).json({ error: "No valid session" });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  const transport = sessionId ? transports.get(sessionId) : undefined;
  if (transport) await transport.handleRequest(req, res);
  else res.status(404).json({ error: "Session not found" });
});

app.listen(PORT, () => {
  console.log(`\n🛒 Stripe Monetization Demo`);
  console.log(`   MCP: http://localhost:${PORT}/mcp`);
  console.log(`   Mode: ${USE_MOCK ? "MOCK" : "LIVE"}\n`);
});

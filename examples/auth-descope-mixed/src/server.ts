import { type AuthInfo, descopeProvider, McpServer } from "skybridge/server";
import * as z from "zod";
import { env } from "./env.js";

const text = (value: string) => ({
  content: [{ type: "text" as const, text: value }],
});

const who = (auth?: AuthInfo) =>
  auth ? ((auth.extra?.email as string | undefined) ?? auth.clientId) : "guest";

const server = new McpServer(
  {
    name: "auth-coffee-mixed",
    version: "0.0.1",
  },
  { capabilities: {} },
  {
    oauth: await descopeProvider({
      url: env.DESCOPE_MCP_SERVER_URL,
      baseUrl: env.SERVER_URL,
    }),
  },
)
  .registerTool(
    {
      name: "browse-catalog",
      description:
        "Browse the public coffee catalog. Works signed out, and greets you by name when a token is present.",
      inputSchema: {},
      auth: { public: true },
      view: { component: "catalog", description: "The coffee catalog" },
    },
    (_args, extra) => {
      const user = who(extra.authInfo);
      const items = ["Espresso", "Latte", "Flat White", "Cold Brew"];
      return {
        structuredContent: { user, items },
        content: [
          { type: "text" as const, text: `Catalog for ${user}: ${items.join(", ")}.` },
        ],
      };
    },
  )
  .registerTool(
    {
      name: "whoami",
      description: "Return the signed-in user. Requires sign-in.",
      inputSchema: {},
      auth: {},
    },
    (_args, extra) => text(`You are ${who(extra.authInfo)}.`),
  )
  .registerTool(
    {
      name: "checkout",
      description: "Place an order. Requires sign-in with the `checkout` scope.",
      inputSchema: { item: z.string().describe("The catalog item to order") },
      auth: { scopes: ["checkout"] },
    },
    ({ item }, extra) => text(`Order placed for ${who(extra.authInfo)}: ${item}.`),
  )
  .registerTool(
    {
      name: "account",
      description:
        "View account details. No auth declared, so it falls back to the secure default (sign-in required).",
      inputSchema: {},
    },
    (_args, extra) => text(`Account details for ${who(extra.authInfo)}.`),
  );

export default await server.run();

export type AppType = typeof server;

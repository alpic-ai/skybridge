import { McpServer } from "skybridge/server";
import * as z from "zod";
import {
  buildWwwAuthenticateHeader,
  getUserId,
  isAuthenticated,
  oauthErrorResult,
} from "./auth.js";
import { getPastOrders, searchCoffeeShops } from "./coffee-data.js";
import { env } from "./env.js";

/**
 * TODO: Mixed-auth (per-tool auth) does NOT work in ChatGPT currently.
 *
 * ChatGPT only supports two modes: fully authenticated OR no authentication.
 * Users will NOT be prompted for authentication when calling a protected tool.
 *
 * The OpenAI Apps SDK documentation suggests using `securitySchemes` to define
 * granular oauth2 per tool, but this is NOT yet implemented in the official
 * @modelcontextprotocol/sdk. The TS SDK doesn't support `securitySchemes` on tools,
 * and `securitySchemes` isn't in the MCP protocol yet (draft SEP).
 *
 * @see https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1488
 *
 * Current behavior in ChatGPT:
 * - If you connect with "No Auth": all tools work, but protected tools fail at runtime
 * - If you connect with OAuth: user authenticates upfront, all tools have auth
 * - There's NO way to prompt users for auth only when they call a protected tool
 *
 * Workaround: We return www-authenticate headers when auth is missing, but ChatGPT
 * doesn't prompt users to sign in - the tool just fails.
 *
 * Once `securitySchemes` is in the protocol and TS SDK, tools could declare:
 * - securitySchemes: [{ type: "noauth" }] for public tools
 * - securitySchemes: [{ type: "oauth2", scopes: [] }] for auth-required tools
 */

const RESOURCE_METADATA_URL = `${env.SERVER_URL}/.well-known/oauth-protected-resource`;

const server = new McpServer(
  {
    name: "mixed-auth-coffee",
    version: "0.0.1",
  },
  { capabilities: {} },
)
  // Tool 1: Mixed auth - works without auth, enhanced with auth
  // TODO: Once securitySchemes is supported, declare: [{ type: "noauth" }, { type: "oauth2" }]
  .registerWidget(
    "search-coffee-paris",
    {
      description: "Search for coffee shops in Paris",
      _meta: {
        ui: {
          csp: {
            resourceDomains: ["https://images.unsplash.com"],
          },
        },
      },
      hosts: ["apps-sdk"],
    },
    {
      description:
        "Search for coffee shops in Paris. Without authentication: shows basic results sorted by rating. With authentication: shows personalized results with your favorites highlighted and sorted first.",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe(
            "Search query (name or specialty, e.g., 'latte', 'espresso')",
          ),
        minRating: z
          .number()
          .min(1)
          .max(5)
          .optional()
          .describe("Minimum rating (1-5)"),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
        destructiveHint: false,
      },
      _meta: {
        "openai/widgetAccessible": true,
      },
    },
    async ({ query, minRating }, extra) => {
      const hasAuth = await isAuthenticated(extra);
      const userId = await getUserId(extra);

      const results = searchCoffeeShops({ query, minRating, userId });

      return {
        structuredContent: {
          shops: results.shops,
          isPersonalized: results.isPersonalized,
          totalCount: results.totalCount,
        },
        _meta: {
          hasAuth,
          userId,
        },
        content: [
          {
            type: "text",
            text: hasAuth
              ? `Found ${results.totalCount} coffee shops in Paris (personalized results with your favorites)`
              : `Found ${results.totalCount} coffee shops in Paris. Sign in to see personalized results with your favorites.`,
          },
        ],
        isError: false,
      };
    },
  )
  // Tool 2: OAuth required - fails without auth
  // TODO: Once securitySchemes is supported, declare: [{ type: "oauth2", scopes: [] }]
  // This would allow ChatGPT to prompt for sign-in BEFORE calling the tool (not working yet)
  .registerWidget(
    "see-past-orders",
    {
      description: "View your past coffee orders",
      _meta: {
        ui: {
          csp: {
            resourceDomains: ["https://images.unsplash.com"],
          },
        },
      },
      hosts: ["apps-sdk"],
    },
    {
      description:
        "View your past coffee orders. Requires authentication to access your order history.",
      inputSchema: {
        limit: z
          .number()
          .min(1)
          .max(50)
          .optional()
          .default(10)
          .describe("Maximum number of orders to return (default: 10)"),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
      _meta: {
        "openai/widgetAccessible": true,
      },
    },
    async ({ limit }, extra) => {
      // Check authentication - this tool REQUIRES auth
      // TODO: With securitySchemes, ChatGPT would prompt for auth before calling.
      // Currently, www-authenticate headers are returned but ChatGPT doesn't act on them.
      const userId = await getUserId(extra);
      if (!userId) {
        const wwwAuth = buildWwwAuthenticateHeader(RESOURCE_METADATA_URL);
        return {
          ...oauthErrorResult(
            wwwAuth,
            "Authentication required to view your past orders. Please sign in to continue.",
          ),
          structuredContent: { requiresAuth: true },
        };
      }

      const orders = getPastOrders(userId, limit);

      return {
        structuredContent: {
          orders,
          totalCount: orders.length,
        },
        content: [
          {
            type: "text",
            text: `Retrieved ${orders.length} past orders for your account.`,
          },
        ],
        isError: false,
      };
    },
  );

export default server;
export type AppType = typeof server;

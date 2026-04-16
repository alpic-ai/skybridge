import "dotenv/config";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { McpServer } from "skybridge/server";
import * as z from "zod";
import { searchCoffeeShops } from "./coffee-data.js";
import { clerkMiddleware } from "@clerk/express";
import {
  mcpAuthClerk,
  protectedResourceHandlerClerk,
} from "@clerk/mcp-tools/express";

/**
 * Auth Example - OAuth Authentication with Clerk
 *
 * This example demonstrates a fully authenticated MCP server where users
 * must sign in via OAuth before using any tools. Auth is enforced at the
 * transport level — unauthenticated requests to /mcp receive HTTP 401.
 *
 * Tool handlers read user identity via extra.authInfo.
 */

const server = new McpServer(
  {
    name: "auth-coffee",
    version: "0.0.1",
  },
  { capabilities: {} },
)
  .use(clerkMiddleware())
  .use("/.well-known/oauth-protected-resource", protectedResourceHandlerClerk())
  .use("/mcp", mcpAuthClerk)
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
    },
    {
      description:
        "Search for coffee shops in Paris. Shows personalized results with your favorites highlighted and sorted first. Requires authentication.",
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
    ({ query, minRating }, extra) => {
      const auth = extra.authInfo as AuthInfo;

      const email = auth.extra?.email as string | undefined;
      const firstName = auth.extra?.firstName as string | null | undefined;

      const results = searchCoffeeShops({
        query,
        minRating,
        userId: auth.clientId,
      });

      const displayName = firstName ?? email?.split("@")[0] ?? "User";

      return {
        structuredContent: {
          shops: results.shops,
          totalCount: results.totalCount,
          userName: displayName,
        },
        content: [
          {
            type: "text",
            text: `Found ${results.totalCount} coffee shops in Paris for ${displayName}`,
          },
        ],
        isError: false,
      };
    },
  );

server.run();

export type AppType = typeof server;

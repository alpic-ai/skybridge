import { intentMiddleware } from "@alpic-ai/insights";
import { type AuthInfo, McpServer, workosProvider } from "skybridge/server";
import * as z from "zod";
import { searchCoffeeShops } from "./coffee-data.js";
import { env } from "./env.js";

/**
 * Auth Example - Full OAuth Authentication with WorkOS AuthKit
 *
 * This example demonstrates a fully authenticated MCP server where users
 * must sign in via OAuth before using any tools. Auth is enforced at the
 * transport level — unauthenticated requests to /mcp receive HTTP 401.
 *
 * Auth is wired with the branded `workosProvider`: it discovers AuthKit's
 * OAuth metadata, then auto-mounts the well-known endpoints and Bearer JWT
 * verification (against AuthKit's JWKS). `audience` is the Resource Indicator
 * configured in the WorkOS dashboard — here, this server's public URL.
 */

const server = new McpServer(
  {
    name: "auth-coffee",
    version: "0.0.1",
  },
  { capabilities: {} },
  {
    oauth: await workosProvider({
      domain: env.AUTHKIT_DOMAIN,
      audience: env.SERVER_URL,
    }),
  },
)
  .mcpMiddleware(intentMiddleware())
  .registerTool(
    {
      name: "search-coffee-paris",
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
      view: {
        component: "search-coffee-paris",
        description: "Search for coffee shops in Paris",
        csp: {
          resourceDomains: ["https://images.unsplash.com"],
        },
      },
      _meta: {
        "openai/widgetAccessible": true,
      },
    },
    ({ query, minRating }, extra) => {
      const auth = extra.authInfo as AuthInfo;

      const email = auth.extra?.email as string | undefined;
      const subject = auth.extra?.subject as string | undefined;

      const results = searchCoffeeShops({
        query,
        minRating,
        userId: subject ?? auth.clientId,
      });

      const displayName = email?.split("@")[0] ?? subject ?? "User";

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

export default await server.run();

export type AppType = typeof server;

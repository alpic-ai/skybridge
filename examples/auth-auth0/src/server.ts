import { intentMiddleware } from "@alpic-ai/insights";
import { type AuthInfo, auth0Provider, McpServer } from "skybridge/server";
import * as z from "zod";
import { searchCoffeeShops } from "./coffee-data.js";
import { env } from "./env.js";

const AUTH0_BASE_URL = `https://${env.AUTH0_DOMAIN}`;

/**
 * Auth Example - Full OAuth Authentication with Auth0
 *
 * This example demonstrates a fully authenticated MCP server where users
 * must sign in via OAuth before using any tools. Auth is enforced at the
 * transport level — unauthenticated requests to /mcp receive HTTP 401.
 *
 * Auth is wired with the branded `auth0Provider`. Auth0 only mints a verifiable
 * JWT when `/authorize` carries an `audience`, so the provider runs skybridge as
 * the authorization server (`serverUrl`) and bakes `?audience=` into the authorize
 * URL — no reliance on the client's resource indicator. Tenant setup: enable
 * Dynamic Client Registration and register an API whose Identifier is `audience`.
 */

const server = new McpServer(
  {
    name: "auth-coffee",
    version: "0.0.1",
  },
  { capabilities: {} },
  {
    oauth: await auth0Provider({
      domain: env.AUTH0_DOMAIN,
      audience: env.AUTH0_AUDIENCE, // Auth0 API Identifier
      serverUrl: env.SERVER_URL, // public URL (skybridge-as-AS)
      // Narrow to what the app needs: Auth0 won't grant a third-party (DCR) client
      // its full OIDC scope set, so advertising it yields "not all authorizations
      // granted".
      scopes: ["openid", "profile", "email"],
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
    async ({ query, minRating }, extra) => {
      const auth = extra.authInfo as AuthInfo;

      try {
        const userInfoResponse = await fetch(`${AUTH0_BASE_URL}/userinfo`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });

        const userInfo = userInfoResponse.ok
          ? ((await userInfoResponse.json()) as {
              name?: string;
              email?: string;
            })
          : null;

        const displayName = userInfo?.name ?? "User";
        const results = searchCoffeeShops({
          query,
          minRating,
          userId: auth?.extra?.subject as string,
        });

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
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to search coffee shops: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

export default await server.run();

export type AppType = typeof server;

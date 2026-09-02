import { intentMiddleware } from "@alpic-ai/insights";
import { Skybridge, stytchProvider } from "skybridge/server";
import * as z from "zod";
import { searchCoffeeShops } from "./coffee-data.js";
import { env } from "./env.js";

/**
 * Auth Example - OAuth Authentication with Stytch
 *
 * This example demonstrates a fully authenticated MCP server where users
 * must sign in via OAuth before using any tools. Auth is enforced at the
 * transport level — unauthenticated requests to /mcp receive HTTP 401.
 *
 * Auth is wired with the branded `stytchProvider`: it discovers the Connected
 * App's OAuth metadata, then auto-mounts the well-known endpoints and Bearer
 * JWT verification (against Stytch's JWKS). `audience` is the Stytch Project ID.
 *
 * Unlike WorkOS/Descope, Stytch ships its consent screen only as a React
 * component, so this server also hosts the authorization page at
 * /assets/authorize.html (+ login.html). Point the Connected App's
 * "Authorization URL" (Stytch dashboard) at that page so Stytch's discovery
 * advertises it as the authorization_endpoint.
 */

export const app = new Skybridge({
  name: "auth-coffee",
  version: "0.0.1",
  oauth: () =>
    stytchProvider({
      domain: env.STYTCH_DOMAIN,
      audience: env.STYTCH_PROJECT_ID,
    }),
  handler: (server) =>
    server
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
          const email = extra.http?.authInfo?.extra?.email;
          const subject = extra.http?.authInfo?.extra?.subject;

          const results = searchCoffeeShops({
            query,
            minRating,
            userId: extra.http?.authInfo?.clientId ?? "anonymous",
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
      )
      .mcpMiddleware(intentMiddleware()),
});

export type AppType = typeof app;

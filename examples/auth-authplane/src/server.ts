import { intentMiddleware } from "@alpic-ai/insights";
import { authplaneProvider, Skybridge } from "skybridge/server";
import * as z from "zod";
import { searchCoffeeShops } from "./coffee-data.js";
import { env } from "./env.js";

/**
 * Auth Example - Full OAuth Authentication with Authplane
 *
 * This example demonstrates a fully authenticated MCP server where users
 * must sign in via OAuth before using any tools. Auth is enforced at the
 * transport level — unauthenticated requests to /mcp receive HTTP 401.
 *
 * Auth is wired with the branded `authplaneProvider`: from the authorization
 * server URL it discovers the OAuth metadata, then auto-mounts the well-known
 * endpoints and Bearer JWT verification (against Authplane's JWKS). Dynamic
 * Client Registration is native, so clients register directly with Authplane
 * and this server stays out of the authorization path.
 *
 * `resource` is required here, unlike the other providers: Authplane binds the
 * token `aud` to the RFC 8707 resource indicator the client sends, and the
 * client takes that from this server's advertised protected-resource metadata.
 * It serves as both the advertised resource and the expected audience. Register
 * the same string as the resource in Authplane — identifiers are compared byte
 * for byte.
 */

export const app = new Skybridge({
  name: "auth-coffee",
  version: "0.0.1",
  oauth: () =>
    authplaneProvider<{ email?: string }>({
      issuer: env.AUTHPLANE_ISSUER,
      resource: env.SERVER_URL,
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
          // `sub` identifies the signed-in user and is what favourites key off.
          // Access tokens carry no profile claims, so there is no display name to
          // show — `email` is read in case a deployment maps one in, and the view
          // falls back to a neutral label when it is absent rather than rendering
          // a raw identifier.
          const subject = extra.http?.authInfo?.extra?.subject;
          const email = extra.http?.authInfo?.extra?.email;
          const userName = email?.split("@")[0];

          const results = searchCoffeeShops({
            query,
            minRating,
            userId: subject ?? extra.http?.authInfo?.clientId ?? "anonymous",
          });

          return {
            structuredContent: {
              shops: results.shops,
              totalCount: results.totalCount,
              userName,
            },
            content: [
              {
                type: "text",
                text: userName
                  ? `Found ${results.totalCount} coffee shops in Paris for ${userName}`
                  : `Found ${results.totalCount} coffee shops in Paris, with your favourites first`,
              },
            ],
            isError: false,
          };
        },
      )
      .mcpMiddleware(intentMiddleware()),
});

export type AppType = typeof app;

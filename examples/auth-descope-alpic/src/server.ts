import { intentMiddleware } from "@alpic-ai/insights";
import {
  customProvider,
  Skybridge,
  type SkybridgeServer,
} from "skybridge/server";
import * as z from "zod";
import { searchCoffeeShops } from "./coffee-data.js";
import { env } from "./env.js";

/**
 * Auth Example - Descope with **DCR disabled**, fronted by the Alpic DCR proxy.
 *
 * Unlike `auth-descope` (branded `descopeProvider`), this wires OAuth via the
 * low-level `customProvider` for the case where the IdP has **no DCR**:
 *
 * - `customProvider` serves metadata without a `registration_endpoint` when the
 *   IdP's discovery omits one (Descope DCR disabled) — no special flag needed.
 * - `serverUrl` advertises **this server** as the authorization server, so Alpic
 *   sits in the registration path and can inject its DCR proxy endpoint. Pointing
 *   clients straight at Descope would make Alpic "delegate" and skip the proxy.
 *
 * Token `aud` is the Descope Project ID (Descope binds `aud` to [client, project]).
 */

/**
 * Derives the Descope Project ID from an MCP Server URL
 * (`…/agentic/<projectId>/<mcpServerId>`). Descope binds the token `aud` to the
 * project id, so it doubles as the audience.
 */
function projectIdFromUrl(url: string): string {
  const projectId = url.match(/\/agentic\/([^/]+)\/[^/]+/)?.[1];
  if (!projectId) {
    throw new Error(
      `Could not derive the Descope project id from "${url}"; pass an explicit \`audience\`.`,
    );
  }
  return projectId;
}

const projectId = projectIdFromUrl(env.DESCOPE_MCP_SERVER_URL);

export const handler = (
  server: SkybridgeServer<{ email?: string; subject?: string }>,
) =>
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
          userId: subject ?? extra.http?.authInfo?.clientId ?? "anonymous",
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
    .mcpMiddleware(intentMiddleware());

export const app = new Skybridge({
  name: "auth-coffee",
  version: "0.0.1",
  capabilities: {},
  oauth: () =>
    customProvider<{ subject?: string; email?: string }>({
      issuer: env.DESCOPE_MCP_SERVER_URL,
      audience: projectId,
      serverUrl: env.SERVER_URL,
    }),
  handler,
});

export type AppType = typeof app;

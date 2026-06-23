import { intentMiddleware } from "@alpic-ai/insights";
import { type AuthInfo, customProvider, McpServer } from "skybridge/server";
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

const projectId = env.DESCOPE_MCP_SERVER_URL.match(/\/agentic\/([^/]+)\//)?.[1];
if (!projectId) {
  throw new Error(
    `Could not derive the Descope project id from "${env.DESCOPE_MCP_SERVER_URL}".`,
  );
}

const server = new McpServer(
  {
    name: "auth-coffee",
    version: "0.0.1",
  },
  { capabilities: {} },
  {
    oauth: await customProvider({
      issuer: env.DESCOPE_MCP_SERVER_URL,
      audience: projectId,
      serverUrl: env.SERVER_URL,
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

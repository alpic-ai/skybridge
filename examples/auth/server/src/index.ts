import { mcpAuthMetadataRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { McpServer } from "skybridge/server";
import * as z from "zod";
import { tryGetAuth } from "./auth.js";
import { searchCoffeeShops } from "./coffee-data.js";
import { env } from "./env.js";

/**
 * Auth Example - Full OAuth Authentication with WorkOS AuthKit
 *
 * This example demonstrates a fully authenticated MCP server where users
 * must sign in via OAuth before using any tools. All tools have access
 * to the authenticated user's identity.
 *
 * Auth flow:
 * 1. ChatGPT discovers OAuth metadata via /.well-known/oauth-authorization-server
 * 2. User is prompted to sign in via WorkOS AuthKit
 * 3. All subsequent tool calls include a Bearer JWT token
 * 4. The server verifies the token and extracts user identity
 */

const server = new McpServer(
  {
    name: "auth-coffee",
    version: "0.0.1",
  },
  { capabilities: {} },
)
  // Mount OAuth metadata so ChatGPT can discover auth endpoints
  .use(
    mcpAuthMetadataRouter({
      oauthMetadata: {
        issuer: `https://${env.AUTHKIT_DOMAIN}`,
        authorization_endpoint: `https://${env.AUTHKIT_DOMAIN}/oauth2/authorize`,
        token_endpoint: `https://${env.AUTHKIT_DOMAIN}/oauth2/token`,
        registration_endpoint: `https://${env.AUTHKIT_DOMAIN}/oauth2/register`,
        response_types_supported: ["code"],
        response_modes_supported: ["query"],
        scopes_supported: ["openid", "profile", "email", "offline_access"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        token_endpoint_auth_methods_supported: ["none"],
        code_challenge_methods_supported: ["S256"],
      },
      resourceServerUrl: new URL(env.SERVER_URL),
    }),
  )
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
    async ({ query, minRating }, extra) => {
      const auth = await tryGetAuth(extra);

      if (!auth) {
        return {
          content: [
            {
              type: "text",
              text: "Authentication required. Please sign in to search coffee shops.",
            },
          ],
          isError: true,
          _meta: {
            "mcp/www_authenticate": [
              `Bearer resource_metadata="${env.SERVER_URL}/.well-known/oauth-protected-resource"`,
            ],
          },
        };
      }

      const results = searchCoffeeShops({
        query,
        minRating,
        userId: auth.userId,
      });

      const displayName =
        auth.firstName ?? auth.email.split("@")[0];

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

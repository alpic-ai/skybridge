import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { mcpAuthMetadataRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { McpServer } from "skybridge/server";
import * as z from "zod";
import { verifyAccessToken } from "./auth.js";
import { searchCoffeeShops } from "./coffee-data.js";
import { env } from "./env.js";

/**
 * Auth Example - Full OAuth Authentication with WorkOS AuthKit
 *
 * This example demonstrates a fully authenticated MCP server where users
 * must sign in via OAuth before using any tools. Auth is enforced at the
 * transport level — unauthenticated requests to /mcp receive HTTP 401.
 *
 * Auth flow:
 * 1. MCP client discovers OAuth metadata via /.well-known/oauth-authorization-server
 * 2. User is prompted to sign in via WorkOS AuthKit
 * 3. MCP client connects to /mcp with a Bearer JWT token
 * 4. requireBearerAuth verifies the token via verifyAccessToken
 * 5. Tool handlers read user identity via extra.authInfo
 */

const server = new McpServer(
  {
    name: "auth-coffee",
    version: "0.0.1",
  },
  { capabilities: {} },
)
  // Mount OAuth metadata so MCP clients can discover auth endpoints
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
  .use("/mcp", requireBearerAuth({ verifier: { verifyAccessToken } }))
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
    ({ query, minRating }, extra) => {
      const auth = extra.authInfo as AuthInfo;

      const email = auth.extra?.email as string;
      const firstName = auth.extra?.firstName as string | null;

      const results = searchCoffeeShops({
        query,
        minRating,
        userId: auth.clientId,
      });

      const displayName = firstName ?? email.split("@")[0];

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

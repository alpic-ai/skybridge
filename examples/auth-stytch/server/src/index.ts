import "dotenv/config";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { McpServer } from "skybridge/server";
import cors from "cors";
import * as z from "zod";
import { searchCoffeeShops } from "./coffee-data.js";
import { verifyAccessToken } from "./auth.js";
import { env } from "./env.js";
import type { RequestHandler } from "express";

/**
 * Auth Example - OAuth Authentication with Stytch
 *
 * This example demonstrates a fully authenticated MCP server where users
 * must sign in via OAuth before using any tools. Auth is enforced at the
 * transport level — unauthenticated requests to /mcp receive HTTP 401.
 *
 * Auth flow:
 * 1. MCP client fetches /.well-known/oauth-protected-resource to discover the Stytch AS
 * 2. MCP client fetches Stytch's /.well-known/oauth-authorization-server for OAuth endpoints
 * 3. User signs in via Stytch
 * 4. MCP client connects to /mcp with a Bearer token
 * 5. requireBearerAuth verifies the token via Stytch's local introspection
 * 6. Tool handlers read user identity via extra.authInfo
 */
// Describes this resource server and points to Stytch as the authorization server.
const protectedResourceHandler: RequestHandler = (_req, res) => {
  res.json({
    resource: env.SERVER_URL,
    authorization_servers: [env.SERVER_URL],
    scopes_supported: ["openid", "email", "profile"],
  });
};

// Proxies Stytch's own AS metadata — real OAuth endpoints come from Stytch, not hardcoded here.
const authorizationServerHandler: RequestHandler = async (_req, res, next) => {
  try {
    const stytchDomain = env.STYTCH_DOMAIN.replace(/\/$/, "");
    const metadata = await fetch(
      `${stytchDomain}/.well-known/oauth-authorization-server`,
    ).then((r) => r.json());
    res.json(metadata);
  } catch (err) {
    next(err);
  }
};

const server = new McpServer(
  {
    name: "auth-coffee",
    version: "0.0.1",
  },
  { capabilities: {} },
)
  .use(cors())
  .use("/.well-known/oauth-protected-resource", protectedResourceHandler)
  .use("/.well-known/oauth-authorization-server", authorizationServerHandler)
  .use(
    "/mcp",
    requireBearerAuth({
      verifier: { verifyAccessToken },
      resourceMetadataUrl: `${env.SERVER_URL}/.well-known/oauth-protected-resource`,
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
      const subject = auth.extra?.subject as string | undefined;

      const results = searchCoffeeShops({
        query,
        minRating,
        userId: auth.clientId,
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

server.run();

export type AppType = typeof server;

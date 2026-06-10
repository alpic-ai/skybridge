import { intentMiddleware } from "@alpic-ai/insights";
import cors from "cors";
import type { RequestHandler } from "express";
import {
  type AuthInfo,
  McpServer,
  mcpAuthMetadataRouter,
  requireBearerAuth,
} from "skybridge/server";
import * as z from "zod";
import { verifyAccessToken } from "./auth.js";
import { searchCoffeeShops } from "./coffee-data.js";
import { env } from "./env.js";

const DESCOPE_MCP_BASE = `https://api.descope.com/oauth2/v1/apps/agentic/${env.DESCOPE_PROJECT_ID}/${env.DESCOPE_MCP_SERVER_ID}`;
const DESCOPE_REGISTRATION_URL = `https://api.descope.com/v1/mgmt/mcp/client/${env.DESCOPE_PROJECT_ID}/${env.DESCOPE_MCP_SERVER_ID}/register`;

// Descope's registration endpoint blocks x-forwarded-host (sent by the playground).
// Proxy it through this server so we control the headers.
const registrationProxy: RequestHandler = async (req, res, next) => {
  try {
    const response = await fetch(DESCOPE_REGISTRATION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const body = await response.text();
    res
      .status(response.status)
      .type(response.headers.get("content-type") ?? "application/json")
      .send(body);
  } catch (err) {
    next(err);
  }
};

/**
 * Auth Example - Full OAuth Authentication with Descope MCP Servers
 *
 * This example demonstrates a fully authenticated MCP server where users
 * must sign in via OAuth before using any tools. Auth is enforced at the
 * transport level via Descope's MCP Server flow.
 *
 * Auth flow:
 * 1. MCP client fetches protected resource metadata via /.well-known/oauth-protected-resource/mcp
 * 2. Client fetches OAuth metadata via /.well-known/oauth-authorization-server
 * 3. User is prompted to sign in via Descope
 * 4. MCP client connects to /mcp with a Bearer JWT token
 * 5. requireBearerAuth verifies the token against Descope's JWKS
 * 6. Tool handlers read user identity via extra.authInfo
 *
 * Configure in Descope Console: Agentic Identity Hub > MCP Servers
 */

const server = new McpServer(
  {
    name: "auth-coffee",
    version: "0.0.1",
  },
  { capabilities: {} },
)
  .use(cors())
  // Proxy DCR to Descope without the x-forwarded-host header the playground injects
  .use("/register", registrationProxy)
  // Serve AS metadata from this server so playground doesn't hit Descope directly
  .use(
    mcpAuthMetadataRouter({
      oauthMetadata: {
        issuer: env.SERVER_URL,
        authorization_endpoint: `${DESCOPE_MCP_BASE}/authorize`,
        token_endpoint: `${DESCOPE_MCP_BASE}/token`,
        registration_endpoint: `${env.SERVER_URL}/register`,
        jwks_uri: `https://api.descope.com/${env.DESCOPE_PROJECT_ID}/.well-known/jwks.json`,
        response_types_supported: ["code"],
        code_challenge_methods_supported: ["S256"],
        token_endpoint_auth_methods_supported: [
          "none",
          "client_secret_basic",
          "client_secret_post",
        ],
        grant_types_supported: ["authorization_code", "refresh_token"],
        scopes_supported: ["openid", "email"],
      },
      resourceServerUrl: new URL("/mcp", env.SERVER_URL),
    }),
  )
  .use(
    "/mcp",
    requireBearerAuth({
      verifier: { verifyAccessToken },
      requiredScopes: ["openid"],
      resourceMetadataUrl: `${env.SERVER_URL}/.well-known/oauth-protected-resource/mcp`,
    }),
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

      const name = auth.extra?.name as string | undefined;
      const email = auth.extra?.email as string | undefined;

      const results = searchCoffeeShops({
        query,
        minRating,
        userId: auth.clientId,
      });

      const displayName = name ?? email?.split("@")[0] ?? "User";

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
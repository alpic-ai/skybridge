import { mcpAuthMetadataRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import express from "express";
import { widgetsDevServer } from "skybridge/server";
import { env } from "./env.js";
import { mcp } from "./middleware.js";
import server from "./server.js";

const isProduction = env.NODE_ENV === "production";

const app = express();

app.use(express.json());

// Add OAuth metadata router for MCP authentication (WorkOS AuthKit)
app.use(
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
);

app.use(mcp(server));

if (!isProduction) {
  const { devtoolsStaticServer } = await import("@skybridge/devtools");
  app.use(await devtoolsStaticServer());
  app.use(await widgetsDevServer());
}

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`
Mixed Auth Coffee Shop Server (WorkOS AuthKit)

Server running at: ${env.SERVER_URL}

Endpoints:
  MCP:                    ${env.SERVER_URL}/mcp
  OAuth Discovery:        ${env.SERVER_URL}/.well-known/oauth-authorization-server
  Protected Resource:     ${env.SERVER_URL}/.well-known/oauth-protected-resource

Tools:
  - search-coffee-paris:  Mixed auth (works without login, personalized with login)
  - see-past-orders:      Requires authentication

${isProduction ? "Running in production mode" : "Running in development mode with HMR"}
  `);
});

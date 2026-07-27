import type { OAuthConfig } from "../index.js";
import { type CustomProviderOptions, customProvider } from "./custom.js";

/**
 * Turns the console's Discovery URL into the authorization server's base URL:
 * drops a `/.well-known/openid-configuration` (or `oauth-authorization-server`)
 * suffix, since discovery appends that path itself, and any trailing slash.
 */
function toAuthorizationServerUrl(discoveryUrl: string): string {
  return discoveryUrl.replace(/\/\.well-known\/[^?#]*$/, "").replace(/\/$/, "");
}

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

/**
 * OAuth provider for a Descope MCP Server. `url` is the MCP Server's **Discovery
 * URL** (a.k.a. Issuer) from the console's Connection Information, e.g.
 * `https://api.descope.com/v1/apps/agentic/<projectId>/<mcpServerId>` (or your
 * custom domain). Requires DCR enabled on the MCP Server. For Descope with DCR
 * disabled and Alpic's DCR proxy, use {@link customProvider} with `serverUrl`
 * instead (see `examples/auth-descope-alpic`). The token `audience` defaults to
 * the **Project ID** derived from the URL — Descope binds `aud` to [DCR client
 * id, project id], not the server URL; pass `audience` to override.
 */
export function descopeProvider(
  opts: { url: string } & Omit<CustomProviderOptions, "issuer">,
): Promise<OAuthConfig> {
  const { url, audience, ...rest } = opts;
  const asUrl = toAuthorizationServerUrl(url);
  const projectId = projectIdFromUrl(asUrl);
  const issuer = `${asUrl.slice(0, asUrl.indexOf("/agentic/"))}/${projectId}`;
  return customProvider({
    issuer,
    audience: audience ?? projectId,
    authorizationServer: asUrl,
    ...rest,
  });
}

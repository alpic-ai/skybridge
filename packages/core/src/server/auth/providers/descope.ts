import { fetchDeclaredIssuer } from "../discovery.js";
import type { OAuthConfig } from "../index.js";
import { type CustomProviderOptions, customProvider } from "./custom.js";

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
export async function descopeProvider(
  opts: { url: string } & Omit<CustomProviderOptions, "issuer">,
): Promise<OAuthConfig> {
  const { url, audience, ...rest } = opts;
  const serverUrl = url
    .replace(/\/\.well-known\/[^?#]*$/, "")
    .replace(/\/$/, "");
  // Newer Descope MCP Servers serve discovery under the agentic path but declare
  // the base project as `issuer`; follow that so customProvider's strict RFC 8414
  // self-reference check holds against it. Only follow a same-origin issuer — a
  // cross-origin one is untrusted, so fall back to the configured URL.
  const declared = await fetchDeclaredIssuer(serverUrl);
  const issuer =
    declared && new URL(declared).origin === new URL(serverUrl).origin
      ? declared
      : serverUrl;
  return customProvider({
    issuer,
    // `aud` is bound to the project id, always carried by the agentic server URL.
    audience: audience ?? projectIdFromUrl(serverUrl),
    ...rest,
  });
}

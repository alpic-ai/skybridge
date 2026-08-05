import type { ExtraClaims } from "../../auth.js";
import type { OAuthConfig } from "../index.js";
import type { RegisteredClaims } from "../verify.js";
import { type CustomProviderOptions, customProvider } from "./custom.js";

/**
 * Claims a Descope session JWT carries. Roles and permissions are nested per
 * tenant when the project uses tenants, and flat otherwise. `email` arrives only
 * through a Custom Claims flow action or a JWT template.
 *
 * @see https://docs.descope.com/authorization/session-management
 * @see https://docs.descope.com/management/token/jwt-templates
 */
export type DescopeClaims = {
  /** Authentication methods used, e.g. `["otp"]`. */
  amr?: string[];
  /** Descope Resource Name: where the token is stored. */
  drn?: string;
  /** The user's active tenant. */
  dct?: string;
  /** Associated tenants, keyed by tenant id. */
  tenants?: Record<string, { roles?: string[]; permissions?: string[] }>;
  /** Roles, when the project has no tenants. */
  roles?: string[];
  /** Permissions, when the project has no tenants. */
  permissions?: string[];
  /** Only via a Custom Claims action or JWT template; not a default claim. */
  email?: string;
};

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
export function descopeProvider<
  TCustom extends ExtraClaims = Record<never, never>,
>(
  opts: { url: string } & Omit<CustomProviderOptions, "issuer">,
): Promise<OAuthConfig<DescopeClaims & TCustom & RegisteredClaims>> {
  const { url, audience, ...rest } = opts;
  const asUrl = toAuthorizationServerUrl(url);
  const projectId = projectIdFromUrl(asUrl);
  const issuer = `${asUrl.slice(0, asUrl.indexOf("/agentic/"))}/${projectId}`;
  return customProvider<DescopeClaims & TCustom>({
    issuer,
    audience: audience ?? projectId,
    authorizationServer: asUrl,
    ...rest,
  });
}

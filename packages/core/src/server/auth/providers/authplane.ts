import type { OAuthConfig } from "../index.js";
import type { RegisteredClaims } from "../verify.js";
import { type CustomProviderOptions, customProvider } from "./custom.js";

/** Options accepted by {@link authplaneProvider}. */
export type AuthplaneProviderOptions = {
  /**
   * The authorization server's issuer identifier (RFC 8414 §2) — your
   * Authplane deployment, e.g. `https://auth.acme.com` (or
   * `http://localhost:9000` in local development).
   */
  issuer: string;
  /**
   * This server's resource identifier (RFC 9728 §1.2): the public URL clients
   * reach, advertised as the `resource` field of its protected-resource
   * metadata. Required, unlike the other providers.
   *
   * Authplane binds the access token's `aud` to the RFC 8707 `resource`
   * parameter the client sends, and the client takes that value from the
   * advertised metadata. Setting it explicitly gives the deployment one fixed
   * identifier, which is what the audience is checked against.
   *
   * Resource identifiers are compared by exact string match, so give it in the
   * form it will be advertised and register that same string in Authplane. RFC
   * 8707 §2 asks for the most specific URI available, e.g.
   * `https://acme.example.com/mcp`.
   */
  resource: string;
  /**
   * Expected token `aud`. Defaults to `resource`.
   *
   * RFC 8707 §2 lets an authorization server use the resource identifier
   * verbatim as the audience or map it to another value; set this only for a
   * resource configured in Authplane with such an override, and pass that
   * value verbatim.
   */
  audience?: string;
} & Omit<CustomProviderOptions, "issuer" | "audience" | "baseUrl">;

/**
 * Rejects anything that cannot serve as an OAuth identifier: RFC 8707 §2
 * requires an absolute URI and forbids a fragment, and the discovery and
 * protected-resource metadata URLs are both built from the scheme and host.
 */
function parseIdentifier(value: string, option: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      `authplaneProvider: \`${option}\` must be an absolute URL, got ${JSON.stringify(value)}`,
    );
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(
      `authplaneProvider: \`${option}\` must use the http or https scheme, got ${JSON.stringify(value)}`,
    );
  }
  if (!parsed.host) {
    throw new Error(
      `authplaneProvider: \`${option}\` must include a host, got ${JSON.stringify(value)}`,
    );
  }
  if (parsed.hash) {
    throw new Error(
      `authplaneProvider: \`${option}\` must not include a fragment, got ${JSON.stringify(value)}`,
    );
  }
  return parsed;
}

/**
 * OAuth provider for Authplane. `issuer` is the authorization server's issuer
 * identifier and `resource` is this server's resource identifier, which also
 * supplies the expected token audience.
 *
 * Dynamic Client Registration is supported natively, so no registration proxy
 * is needed: clients register with Authplane directly and this server stays out
 * of the authorization path. Pass `serverUrl` to advertise this server as the
 * authorization server instead (see {@link customProvider}).
 */
export function authplaneProvider<
  TCustom extends Record<string, unknown> = Record<never, never>,
>(
  opts: AuthplaneProviderOptions,
): Promise<OAuthConfig<TCustom & RegisteredClaims>> {
  const { issuer, resource, audience, ...rest } = opts;

  parseIdentifier(issuer, "issuer");
  const parsedResource = parseIdentifier(resource, "resource");

  // The advertised resource is the URL-normalised form of this value. Where
  // normalisation would change the string — a bare origin gaining a root path,
  // an uppercase host, an explicit default port — the configured and advertised
  // identifiers would differ, and the audience check compares them exactly.
  // Require the advertised form up front so the two always match.
  if (parsedResource.href !== resource) {
    throw new Error(
      `authplaneProvider: \`resource\` must be given in the form it will be advertised. ` +
        `${JSON.stringify(resource)} is advertised as ${JSON.stringify(parsedResource.href)}. ` +
        `Use ${JSON.stringify(parsedResource.href)}, or a path-qualified URL such as "https://acme.example.com/mcp", and register the same value in Authplane.`,
    );
  }

  return customProvider<TCustom>({
    issuer,
    audience: audience ?? resource,
    baseUrl: resource,
    ...rest,
  });
}

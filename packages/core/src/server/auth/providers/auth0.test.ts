// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { auth0Provider } from "./auth0.js";

afterEach(() => vi.restoreAllMocks());

function doc(issuer: string) {
  return {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    registration_endpoint: `${issuer}/oidc/register`,
    response_types_supported: ["code"],
    scopes_supported: ["openid", "profile", "email"],
    jwks_uri: `${issuer}/.well-known/jwks.json`,
  };
}

describe("auth0Provider", () => {
  it("advertises skybridge as the AS (static issuer) and bakes audience; verifies against Auth0", async () => {
    const issuer = "https://acme.us.auth0.com";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(doc(issuer)), {
        headers: { "content-type": "application/json" },
      }),
    );

    const config = await auth0Provider({
      domain: "acme.us.auth0.com",
      audience: "https://api.example.com/",
      serverUrl: "https://app.example.com/",
      scopes: ["openid", "profile", "email"],
    });

    // skybridge is the advertised AS: static issuer = serverUrl (trailing slash stripped).
    expect(config.oauthMetadata.issuer).toBe("https://app.example.com");
    // AS metadata scopes match the advertised set (clients read scopes from here).
    expect(config.oauthMetadata.scopes_supported).toEqual([
      "openid",
      "profile",
      "email",
    ]);
    expect(config.scopesSupported).toEqual(["openid", "profile", "email"]);
    // audience baked into the advertised authorize endpoint (still pointing at Auth0).
    const url = new URL(config.oauthMetadata.authorization_endpoint);
    expect(url.origin + url.pathname).toBe(`${issuer}/authorize`);
    expect(url.searchParams.get("audience")).toBe("https://api.example.com/");
    // baseUrl left unset so the PRM resource resolves per request (Alpic-safe).
    expect(config.baseUrl).toBeUndefined();
    // token verification still uses Auth0 as issuer + the API audience.
    expect(config.verify.issuer).toBe(issuer);
    expect(config.verify.audience).toBe("https://api.example.com/");
  });
});

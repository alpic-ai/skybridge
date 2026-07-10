// @vitest-environment node
import http from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { customProvider } from "./custom.js";

let server: http.Server | undefined;
afterEach(() => server?.close());

function doc(origin: string, extra: Record<string, unknown> = {}) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/authorize`,
    token_endpoint: `${origin}/token`,
    registration_endpoint: `${origin}/register`,
    response_types_supported: ["code"],
    scopes_supported: ["openid", "email", "profile"],
    jwks_uri: `${origin}/jwks`,
    ...extra,
  };
}

// Serves the discovery doc (built from the live origin) at the OIDC well-known path.
async function serveDiscovery(extra: Record<string, unknown> = {}) {
  let origin = "";
  const srv = http.createServer((req, res) => {
    if (req.url !== "/.well-known/openid-configuration") {
      res.writeHead(404).end();
      return;
    }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(doc(origin, extra)));
  });
  await new Promise<void>((resolve) => srv.listen(0, resolve));
  server = srv;
  origin = `http://localhost:${(srv.address() as { port: number }).port}`;
  return origin;
}

describe("customProvider", () => {
  it("builds an OAuthConfig from discovery", async () => {
    const base = await serveDiscovery();

    const config = await customProvider({
      issuer: base,
      audience: "my-api",
      baseUrl: "https://app.example.test",
      scopes: ["openid"],
    });

    expect(config.baseUrl).toBe("https://app.example.test");
    expect(config.verify).toEqual({
      issuer: base,
      audience: "my-api",
      jwksUri: `${base}/jwks`,
    });
    expect(config.scopesSupported).toEqual(["openid"]);
    expect(config.oauthMetadata.registration_endpoint).toBe(`${base}/register`);
  });

  it("ignores a runtime issuer override (keeps the discovered trust anchor)", async () => {
    const base = await serveDiscovery();
    const config = await customProvider({
      issuer: base,
      audience: "a",
      metadataOverrides: { issuer: "https://evil.test" } as never,
    });
    expect(config.verify.issuer).toBe(base);
    expect(config.oauthMetadata.issuer).toBe(base);
  });

  it("ignores a runtime jwks_uri override (keeps the discovered signing keys)", async () => {
    const base = await serveDiscovery();
    const config = await customProvider({
      issuer: base,
      audience: "a",
      metadataOverrides: { jwks_uri: "https://evil.test/keys" } as never,
    });
    expect(config.verify.jwksUri).toBe(`${base}/jwks`);
  });

  it("serves metadata without a registration_endpoint when the IdP has no DCR", async () => {
    const base = await serveDiscovery({ registration_endpoint: undefined });
    const config = await customProvider({ issuer: base, audience: "a" });
    expect(config.oauthMetadata.registration_endpoint).toBeUndefined();
    expect(config.verify.issuer).toBe(base);
  });

  it("throws when discovery has no jwks_uri (token verification needs it)", async () => {
    const base = await serveDiscovery({ jwks_uri: undefined });
    await expect(
      customProvider({ issuer: base, audience: "a" }),
    ).rejects.toThrow(/jwks_uri/);
  });

  it("serverUrl advertises this server as the AS, keeping the IdP as the token issuer", async () => {
    const base = await serveDiscovery();
    const config = await customProvider({
      issuer: base,
      audience: "a",
      serverUrl: "https://app.example.test/",
      scopes: ["openid"],
    });
    // AS metadata + advertised scopes reflect this server.
    expect(config.oauthMetadata.issuer).toBe("https://app.example.test");
    expect(config.oauthMetadata.scopes_supported).toEqual(["openid"]);
    // but the token's issuer is still verified against the IdP.
    expect(config.verify.issuer).toBe(base);
  });

  it("authorizationServer advertises a distinct AS, keeping the discovered issuer for verification", async () => {
    const base = await serveDiscovery();
    const config = await customProvider({
      issuer: base,
      audience: "a",
      authorizationServer: "https://as.example.test/agentic/P1/MS1/",
    });
    expect(config.oauthMetadata.issuer).toBe(
      "https://as.example.test/agentic/P1/MS1",
    );
    expect(config.verify.issuer).toBe(base);
  });

  it("serverUrl takes precedence over authorizationServer", async () => {
    const base = await serveDiscovery();
    const config = await customProvider({
      issuer: base,
      audience: "a",
      serverUrl: "https://app.example.test/",
      authorizationServer: "https://as.example.test/agentic/P1/MS1",
    });
    expect(config.oauthMetadata.issuer).toBe("https://app.example.test");
    expect(config.verify.issuer).toBe(base);
  });

  it("applies metadataOverrides over discovered values", async () => {
    const base = await serveDiscovery();
    const config = await customProvider({
      issuer: base,
      audience: "a",
      baseUrl: "https://app.example.test",
      metadataOverrides: { token_endpoint: "https://override/token" },
    });
    expect(config.oauthMetadata.token_endpoint).toBe("https://override/token");
  });
});

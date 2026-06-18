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

  it("defaults scopesSupported to the discovered scopes", async () => {
    const base = await serveDiscovery();
    const config = await customProvider({
      issuer: base,
      audience: "a",
      baseUrl: "https://app.example.test",
    });
    expect(config.scopesSupported).toEqual(["openid", "email", "profile"]);
  });

  it("allows omitting baseUrl (server infers it from headers)", async () => {
    const base = await serveDiscovery();
    const config = await customProvider({ issuer: base, audience: "a" });
    expect(config.baseUrl).toBeUndefined();
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

  it("rejects a non-DCR IdP (no registration_endpoint)", async () => {
    const base = await serveDiscovery({ registration_endpoint: undefined });
    await expect(
      customProvider({
        issuer: base,
        audience: "a",
        baseUrl: "https://app.example.test",
      }),
    ).rejects.toThrow(/not DCR-compatible/);
  });

  it("rejects a non-DCR IdP even if an override supplies registration_endpoint", async () => {
    const base = await serveDiscovery({ registration_endpoint: undefined });
    await expect(
      customProvider({
        issuer: base,
        audience: "a",
        metadataOverrides: { registration_endpoint: `${base}/register` },
      }),
    ).rejects.toThrow(/not DCR-compatible/);
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

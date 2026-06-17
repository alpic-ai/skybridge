// @vitest-environment node
import http from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { customProvider } from "./custom.js";

let server: http.Server | undefined;
afterEach(() => server?.close());

async function serveDiscovery(doc: Record<string, unknown>) {
  const srv = http.createServer((req, res) => {
    if (req.url !== "/.well-known/openid-configuration") {
      res.writeHead(404).end();
      return;
    }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(doc));
  });
  await new Promise<void>((resolve) => srv.listen(0, resolve));
  server = srv;
  const port = (srv.address() as { port: number }).port;
  return `http://localhost:${port}`;
}

const ISSUER = "https://idp.test";
function doc(extra: Record<string, unknown> = {}) {
  return {
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/authorize`,
    token_endpoint: `${ISSUER}/token`,
    registration_endpoint: `${ISSUER}/register`,
    response_types_supported: ["code"],
    scopes_supported: ["openid", "email", "profile"],
    jwks_uri: `${ISSUER}/jwks`,
    ...extra,
  };
}

describe("customProvider", () => {
  it("builds an OAuthConfig from discovery", async () => {
    const base = await serveDiscovery(doc());

    const config = await customProvider({
      issuer: base,
      audience: "my-api",
      baseUrl: "https://app.example.test",
      scopes: ["openid"],
      enforcement: "optional",
    });

    expect(config.baseUrl).toBe("https://app.example.test");
    expect(config.verify).toEqual({
      issuer: ISSUER,
      audience: "my-api",
      jwksUri: `${ISSUER}/jwks`,
    });
    expect(config.scopesSupported).toEqual(["openid"]);
    expect(config.enforcement).toBe("optional");
    expect(config.oauthMetadata.registration_endpoint).toBe(
      `${ISSUER}/register`,
    );
  });

  it("defaults scopesSupported to the discovered scopes", async () => {
    const base = await serveDiscovery(doc());
    const config = await customProvider({
      issuer: base,
      audience: "a",
      baseUrl: "https://app.example.test",
    });
    expect(config.scopesSupported).toEqual(["openid", "email", "profile"]);
  });

  it("rejects a non-DCR IdP (no registration_endpoint)", async () => {
    const base = await serveDiscovery(
      doc({ registration_endpoint: undefined }),
    );
    await expect(
      customProvider({
        issuer: base,
        audience: "a",
        baseUrl: "https://app.example.test",
      }),
    ).rejects.toThrow(/not DCR-compatible/);
  });

  it("applies metadataOverrides over discovered values", async () => {
    const base = await serveDiscovery(doc());
    const config = await customProvider({
      issuer: base,
      audience: "a",
      baseUrl: "https://app.example.test",
      metadataOverrides: { token_endpoint: "https://override/token" },
    });
    expect(config.oauthMetadata.token_endpoint).toBe("https://override/token");
  });
});

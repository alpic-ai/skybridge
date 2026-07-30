// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { authplaneProvider } from "./authplane.js";

afterEach(() => vi.restoreAllMocks());

const ISSUER = "https://auth.acme.com";

function discoveryDoc(issuer: string, scopes: string[]) {
  return {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    registration_endpoint: `${issuer}/register`,
    response_types_supported: ["code"],
    scopes_supported: scopes,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
  };
}

function mockDiscovery(docs: Record<string, string[]>) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      const entry = Object.entries(docs).find(
        ([issuer]) => url === `${issuer}/.well-known/openid-configuration`,
      );
      if (entry === undefined) {
        return new Response(null, { status: 404 });
      }
      return new Response(JSON.stringify(discoveryDoc(...entry)), {
        headers: { "content-type": "application/json" },
      });
    });
}

describe("authplaneProvider", () => {
  it("derives the audience from the resource the server advertises", async () => {
    mockDiscovery({ [ISSUER]: ["checkout"] });

    const config = await authplaneProvider({
      issuer: ISSUER,
      resource: "https://coffee.example.com/mcp",
    });

    expect(config.verify.audience).toBe("https://coffee.example.com/mcp");
    expect(config.verify.issuer).toBe(ISSUER);
    expect(config.verify.jwksUri).toBe(`${ISSUER}/.well-known/jwks.json`);
    expect(config.baseUrl).toBe("https://coffee.example.com/mcp");
  });

  it.each([
    "https://coffee.example.com/mcp",
    "https://coffee.example.com/v2/mcp",
    "https://coffee.example.com/",
    "http://localhost:3000/mcp",
    "https://coffee.example.com:8443/mcp",
  ])("passes %s through as both resource and audience", async (resource) => {
    mockDiscovery({ [ISSUER]: ["checkout"] });

    const config = await authplaneProvider({ issuer: ISSUER, resource });

    expect(config.baseUrl).toBe(resource);
    expect(config.verify.audience).toBe(resource);
  });

  // The metadata router serialises the resource identifier through `URL` before
  // advertising it. Anything that serialisation would rewrite is refused here,
  // so the advertised identifier is always the configured one.
  it.each([
    // Pathless origin — gains a root path.
    ["https://coffee.example.com", "https://coffee.example.com/"],
    ["http://localhost:3000", "http://localhost:3000/"],
    // Uppercase host — lowercased.
    ["https://COFFEE.EXAMPLE.COM/mcp", "https://coffee.example.com/mcp"],
    // Explicit default port — dropped.
    ["https://coffee.example.com:443/mcp", "https://coffee.example.com/mcp"],
  ])("rejects %s and names %s instead", async (resource, published) => {
    const fetchSpy = mockDiscovery({ [ISSUER]: ["checkout"] });

    expect(() => authplaneProvider({ issuer: ISSUER, resource })).toThrow(
      `is advertised as ${JSON.stringify(published)}`,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("lets an explicit audience override the default", async () => {
    mockDiscovery({ [ISSUER]: ["checkout"] });

    const config = await authplaneProvider({
      issuer: ISSUER,
      resource: "https://coffee.example.com/mcp",
      audience: "urn:acme:coffee",
    });

    expect(config.verify.audience).toBe("urn:acme:coffee");
  });

  it.each([
    ["coffee.example.com/mcp", /must be an absolute URL/],
    ["ftp://coffee.example.com/mcp", /must use the http or https scheme/],
    ["https://coffee.example.com/mcp#frag", /must not include a fragment/],
  ])("rejects the malformed resource %s", async (resource, message) => {
    const fetchSpy = mockDiscovery({ [ISSUER]: ["checkout"] });

    expect(() => authplaneProvider({ issuer: ISSUER, resource })).toThrow(
      message,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a malformed issuer before any discovery", async () => {
    const fetchSpy = mockDiscovery({ [ISSUER]: ["checkout"] });

    expect(() =>
      authplaneProvider({
        issuer: "auth.acme.com",
        resource: "https://coffee.example.com/mcp",
      }),
    ).toThrow(/`issuer` must be an absolute URL/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("accepts an issuer carrying a trailing slash", async () => {
    // Discovery resolves the issuer itself; the provider passes it through
    // rather than rewriting the operator's value.
    mockDiscovery({ [ISSUER]: ["checkout"] });

    const config = await authplaneProvider({
      issuer: `${ISSUER}/`,
      resource: "https://coffee.example.com/mcp",
    });

    expect(config.verify.issuer).toBe(ISSUER);
  });

  it("accepts a local http issuer for development", async () => {
    const local = "http://localhost:9000";
    mockDiscovery({ [local]: ["checkout"] });

    const config = await authplaneProvider({
      issuer: local,
      resource: "http://localhost:3000/mcp",
    });

    expect(config.verify.issuer).toBe(local);
    expect(config.verify.audience).toBe("http://localhost:3000/mcp");
  });

  it("forwards scopes and the required-scope floor", async () => {
    mockDiscovery({ [ISSUER]: ["checkout", "profile"] });

    const config = await authplaneProvider({
      issuer: ISSUER,
      resource: "https://coffee.example.com/mcp",
      scopes: ["checkout"],
      requiredScopes: ["checkout"],
    });

    expect(config.scopesSupported).toEqual(["checkout"]);
    expect(config.requiredScopes).toEqual(["checkout"]);
  });

  it("advertises the registration endpoint for dynamic client registration", async () => {
    mockDiscovery({ [ISSUER]: ["checkout"] });

    const config = await authplaneProvider({
      issuer: ISSUER,
      resource: "https://coffee.example.com/mcp",
    });

    expect(config.oauthMetadata.issuer).toBe(ISSUER);
    expect(config.oauthMetadata.registration_endpoint).toBe(
      `${ISSUER}/register`,
    );
  });
});

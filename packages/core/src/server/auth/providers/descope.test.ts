// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { descopeProvider } from "./descope.js";

afterEach(() => vi.restoreAllMocks());

function discoveryDoc(issuer: string) {
  return {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    registration_endpoint: `${issuer}/register`,
    response_types_supported: ["code"],
    scopes_supported: ["openid"],
    jwks_uri: `${issuer}/.well-known/jwks.json`,
  };
}

function mockDiscovery(issuer: string) {
  // A fresh Response per call: the provider fetches discovery twice (to read the
  // declared issuer, then again inside customProvider), and a body reads once.
  return vi.spyOn(globalThis, "fetch").mockImplementation(
    async () =>
      new Response(JSON.stringify(discoveryDoc(issuer)), {
        headers: { "content-type": "application/json" },
      }),
  );
}

describe("descopeProvider", () => {
  it("derives issuer and audience (project id) from the MCP Server URL", async () => {
    const issuer = "https://api.descope.com/v1/apps/agentic/P123/MS456";
    const fetchSpy = mockDiscovery(issuer);

    const config = await descopeProvider({ url: issuer });

    expect(fetchSpy).toHaveBeenCalledWith(
      `${issuer}/.well-known/openid-configuration`,
      expect.anything(),
    );
    expect(config.verify.issuer).toBe(issuer);
    expect(config.verify.audience).toBe("P123");
  });

  it("lets an explicit audience override the derived project id", async () => {
    const issuer = "https://api.descope.com/v1/apps/agentic/P123/MS456";
    mockDiscovery(issuer);

    const config = await descopeProvider({ url: issuer, audience: "custom" });

    expect(config.verify.audience).toBe("custom");
  });

  it("follows a same-origin base-project issuer declared by the discovery doc", async () => {
    // Newer MCP Servers serve discovery at the agentic path but declare the base
    // project as issuer; the resolved issuer follows it (RFC 8414 self-reference
    // then holds), while the audience stays the project id from the agentic URL.
    const url = "https://api.descope.com/v1/apps/agentic/P123/MS456";
    const base = "https://api.descope.com/v1/apps/P123";
    mockDiscovery(base);

    const config = await descopeProvider({ url });

    expect(config.verify.issuer).toBe(base);
    expect(config.verify.audience).toBe("P123");
    expect(config.verify.jwksUri).toBe(`${base}/.well-known/jwks.json`);
  });

  it("does not follow a cross-origin declared issuer", async () => {
    const url = "https://api.descope.com/v1/apps/agentic/P123/MS456";
    const evil = "https://evil.test/v1/apps/P123";
    const fetchSpy = mockDiscovery(evil);

    // The cross-origin issuer is not followed, so discovery is re-run against the
    // configured URL, where the doc's issuer no longer matches — startup fails
    // rather than redirecting trust to evil.test.
    await expect(descopeProvider({ url })).rejects.toThrow(/discovery failed/i);
    expect(fetchSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("evil.test"),
      expect.anything(),
    );
  });
});

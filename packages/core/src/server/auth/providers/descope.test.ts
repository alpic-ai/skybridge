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
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
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
});

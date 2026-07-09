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
  return vi.spyOn(globalThis, "fetch").mockImplementation(
    async () =>
      new Response(JSON.stringify(discoveryDoc(issuer)), {
        headers: { "content-type": "application/json" },
      }),
  );
}

describe("descopeProvider", () => {
  it("builds the base-project issuer and audience (project id) from the MCP Server URL", async () => {
    const url = "https://api.descope.com/v1/apps/agentic/P123/MS456";
    const base = "https://api.descope.com/v1/apps/P123";
    const fetchSpy = mockDiscovery(base);

    const config = await descopeProvider({ url });

    expect(fetchSpy).toHaveBeenCalledWith(
      `${base}/.well-known/openid-configuration`,
      expect.anything(),
    );
    expect(config.verify.issuer).toBe(base);
    expect(config.verify.audience).toBe("P123");
  });

  it("lets an explicit audience override the derived project id", async () => {
    const url = "https://api.descope.com/v1/apps/agentic/P123/MS456";
    mockDiscovery("https://api.descope.com/v1/apps/P123");

    const config = await descopeProvider({ url, audience: "custom" });

    expect(config.verify.audience).toBe("custom");
  });
});

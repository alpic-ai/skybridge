// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { descopeProvider } from "./descope.js";

afterEach(() => vi.restoreAllMocks());

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

const PROJECT = "https://api.descope.com/v1/apps/P123";
const AGENTIC = "https://api.descope.com/v1/apps/agentic/P123/MS456";

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

describe("descopeProvider", () => {
  it("verifies against the agentic issuer it advertises", async () => {
    const fetchSpy = mockDiscovery({
      [PROJECT]: ["openid", "profile", "email", "phone"],
      [AGENTIC]: ["checkout"],
    });

    const config = await descopeProvider({ url: AGENTIC });

    expect(fetchSpy).toHaveBeenCalledWith(
      `${PROJECT}/.well-known/openid-configuration`,
      expect.anything(),
    );
    expect(config.verify.issuer).toBe(AGENTIC);
    expect(config.verify.audience).toBe("P123");
    expect(config.oauthMetadata.issuer).toBe(AGENTIC);
    expect(config.oauthMetadata.registration_endpoint).toBe(
      `${AGENTIC}/register`,
    );
    expect(config.scopesSupported).toEqual(["checkout"]);
  });

  it("accepts a URL carrying the well-known suffix", async () => {
    mockDiscovery({ [PROJECT]: ["openid"], [AGENTIC]: ["checkout"] });

    const config = await descopeProvider({
      url: `${AGENTIC}/.well-known/openid-configuration`,
    });

    expect(config.oauthMetadata.issuer).toBe(AGENTIC);
    expect(config.scopesSupported).toEqual(["checkout"]);
  });

  it("lets an explicit audience override the derived project id", async () => {
    mockDiscovery({ [PROJECT]: ["openid"], [AGENTIC]: ["checkout"] });

    const config = await descopeProvider({ url: AGENTIC, audience: "custom" });

    expect(config.verify.audience).toBe("custom");
  });
});

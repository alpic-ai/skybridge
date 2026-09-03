// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { clerkProvider } from "./clerk.js";
import { lastJwksConfig as jwks } from "./verify-spy.js";

vi.mock("../verify.js", () => import("./verify-spy.js"));

afterEach(() => vi.restoreAllMocks());

function doc(issuer: string) {
  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    registration_endpoint: `${issuer}/oauth/register`,
    response_types_supported: ["code"],
    scopes_supported: ["profile", "email"],
    jwks_uri: `${issuer}/.well-known/jwks.json`,
  };
}

describe("clerkProvider", () => {
  it("verifies issuer + JWKS with no audience (Clerk tokens carry no aud)", async () => {
    const issuer = "https://acme.clerk.accounts.dev";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(doc(issuer)), {
        headers: { "content-type": "application/json" },
      }),
    );

    await clerkProvider({ domain: "acme.clerk.accounts.dev" }).resolve();

    expect(fetchSpy).toHaveBeenCalledWith(
      `${issuer}/.well-known/openid-configuration`,
      expect.anything(),
    );
    expect(jwks().issuer).toBe(issuer);
    expect(jwks().audience).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import type { AuthInfo } from "../auth.js";
import type { SecurityScheme } from "../server.js";
import {
  authToSecuritySchemes,
  clientPrefersInBandChallenge,
  evaluateSecuritySchemes,
  securitySchemesAllowAnonymous,
  wwwAuthenticateHeader,
} from "./security-schemes.js";

describe("clientPrefersInBandChallenge", () => {
  it("detects ChatGPT / OpenAI user agents", () => {
    expect(clientPrefersInBandChallenge("openai-mcp/1.0")).toBe(true);
    expect(clientPrefersInBandChallenge("ChatGPT")).toBe(true);
    expect(clientPrefersInBandChallenge("Claude-User/1.0")).toBe(false);
    expect(clientPrefersInBandChallenge(undefined)).toBe(false);
  });
});

describe("authToSecuritySchemes", () => {
  it("maps the auth shorthand", () => {
    expect(authToSecuritySchemes({ allowsAnonymous: true })).toEqual([
      { type: "noauth" },
      { type: "oauth2" },
    ]);
    expect(authToSecuritySchemes({})).toEqual([{ type: "oauth2" }]);
    expect(authToSecuritySchemes({ scopes: ["checkout"] })).toEqual([
      { type: "oauth2", scopes: ["checkout"] },
    ]);
    expect(
      authToSecuritySchemes({ allowsAnonymous: true, scopes: ["checkout"] }),
    ).toEqual([{ type: "noauth" }, { type: "oauth2", scopes: ["checkout"] }]);
  });
});

const authInfo = (scopes: string[]): AuthInfo => ({
  token: "t",
  clientId: "c",
  scopes,
});

describe("securitySchemesAllowAnonymous", () => {
  it("is true only when a noauth scheme is present", () => {
    expect(securitySchemesAllowAnonymous([{ type: "noauth" }])).toBe(true);
    expect(
      securitySchemesAllowAnonymous([{ type: "noauth" }, { type: "oauth2" }]),
    ).toBe(true);
    expect(securitySchemesAllowAnonymous([{ type: "oauth2" }])).toBe(false);
    expect(securitySchemesAllowAnonymous(undefined)).toBe(false);
  });
});

describe("evaluateSecuritySchemes", () => {
  it("lets anonymous callers through a noauth tool", () => {
    const schemes: SecurityScheme[] = [{ type: "noauth" }, { type: "oauth2" }];
    expect(evaluateSecuritySchemes(schemes, undefined)).toBeUndefined();
  });

  it("enforces oauth2 scopes on a public tool once a token is present", () => {
    const schemes: SecurityScheme[] = [
      { type: "noauth" },
      { type: "oauth2", scopes: ["checkout"] },
    ];
    expect(evaluateSecuritySchemes(schemes, undefined)).toBeUndefined();
    expect(evaluateSecuritySchemes(schemes, authInfo(["openid"]))?.error).toBe(
      "insufficient_scope",
    );
    expect(
      evaluateSecuritySchemes(schemes, authInfo(["checkout"])),
    ).toBeUndefined();
  });

  it("fails an oauth2-only tool with no token (invalid_token / 401)", () => {
    expect(
      evaluateSecuritySchemes([{ type: "oauth2" }], undefined)?.error,
    ).toBe("invalid_token");
  });

  it("fails when the token is missing a required scope (insufficient_scope / 403)", () => {
    const schemes: SecurityScheme[] = [
      { type: "oauth2", scopes: ["checkout"] },
    ];
    expect(evaluateSecuritySchemes(schemes, authInfo(["openid"]))?.error).toBe(
      "insufficient_scope",
    );
  });

  it("passes when the token carries every required scope", () => {
    const schemes: SecurityScheme[] = [
      { type: "oauth2", scopes: ["checkout"] },
    ];
    expect(
      evaluateSecuritySchemes(schemes, authInfo(["openid", "checkout"])),
    ).toBeUndefined();
  });

  it("treats an undeclared tool as auth-required, satisfied by any valid token", () => {
    expect(evaluateSecuritySchemes(undefined, undefined)?.error).toBe(
      "invalid_token",
    );
    expect(evaluateSecuritySchemes(undefined, authInfo([]))).toBeUndefined();
  });

  it("carries the tool's required scopes on the failure", () => {
    const schemes: SecurityScheme[] = [
      { type: "oauth2", scopes: ["checkout"] },
    ];
    expect(evaluateSecuritySchemes(schemes, undefined)?.scopes).toEqual([
      "checkout",
    ]);
    expect(
      evaluateSecuritySchemes(schemes, authInfo(["openid"]))?.scopes,
    ).toEqual(["checkout"]);
  });
});

describe("wwwAuthenticateHeader", () => {
  it("names the required scopes so the client can step up", () => {
    const header = wwwAuthenticateHeader({
      error: "insufficient_scope",
      description: "Missing required scope for this tool.",
      scopes: ["checkout"],
    });
    expect(header).toContain('error="insufficient_scope"');
    expect(header).toContain('scope="checkout"');
  });

  it("omits the scope parameter when there are none", () => {
    const header = wwwAuthenticateHeader({
      error: "invalid_token",
      description: "Sign in to use this tool.",
      scopes: [],
    });
    expect(header).not.toContain("scope=");
  });
});

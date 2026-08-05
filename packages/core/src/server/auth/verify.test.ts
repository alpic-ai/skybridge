// @vitest-environment node
import http from "node:http";
import * as jose from "jose";
import { afterEach, describe, expect, it } from "vitest";
import { createJwksVerifier } from "./verify.js";

const ISSUER = "https://issuer.test";
const AUDIENCE = "api://default";

let jwksServer: http.Server | undefined;
afterEach(() => jwksServer?.close());

async function startJwks() {
  const { publicKey, privateKey } = await jose.generateKeyPair("RS256");
  const jwk = {
    ...(await jose.exportJWK(publicKey)),
    kid: "test-key",
    alg: "RS256",
    use: "sig",
  };
  const server = http.createServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  jwksServer = server;
  const port = (server.address() as { port: number }).port;
  return { privateKey, jwksUri: `http://localhost:${port}/jwks` };
}

function sign(
  key: CryptoKey,
  claims: Record<string, unknown>,
  opts: { issuer?: string; audience?: string; expiresAt?: string } = {},
) {
  return new jose.SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(opts.issuer ?? ISSUER)
    .setAudience(opts.audience ?? AUDIENCE)
    .setExpirationTime(opts.expiresAt ?? "1h")
    .sign(key);
}

it("rejects a config with no issuer", () => {
  expect(() => createJwksVerifier({ issuer: "" })).toThrow(
    /requires an `issuer`/,
  );
});

describe("createJwksVerifier", () => {
  it("verifies a valid token and maps claims to AuthInfo", async () => {
    const { privateKey, jwksUri } = await startJwks();
    const verifier = createJwksVerifier({
      issuer: ISSUER,
      audience: AUDIENCE,
      jwksUri,
    });
    const token = await sign(privateKey, {
      client_id: "client-1",
      scope: "openid email",
      sub: "user-1",
      email: "a@b.test",
    });

    const auth = await verifier.verifyAccessToken(token);

    expect(auth.token).toBe(token);
    expect(auth.clientId).toBe("client-1");
    expect(auth.scopes).toEqual(["openid", "email"]);
    expect(auth.extra?.subject).toBe("user-1");
    expect(auth.extra?.email).toBe("a@b.test");
  });

  it("rejects a token with the wrong audience", async () => {
    const { privateKey, jwksUri } = await startJwks();
    const verifier = createJwksVerifier({
      issuer: ISSUER,
      audience: AUDIENCE,
      jwksUri,
    });
    const token = await sign(
      privateKey,
      { client_id: "c" },
      { audience: "api://other" },
    );

    await expect(verifier.verifyAccessToken(token)).rejects.toThrow(
      /Token verification failed/,
    );
  });

  // jose quotes claim names — `"exp" claim timestamp check failed`, `unexpected
  // "aud" claim value`. Those quotes would close `error_description="…"` early,
  // dropping the `resource_metadata` that MCP clients start discovery from.
  it.each([
    [
      "an expired token",
      (key: CryptoKey) => sign(key, {}, { expiresAt: "-1h" }),
      // jose: `"exp" claim timestamp check failed`
      "Token verification failed: exp  claim timestamp check failed",
    ],
    [
      "a token issued for another resource",
      (key: CryptoKey) => sign(key, {}, { audience: "api://other" }),
      // jose: `unexpected "aud" claim value`
      "Token verification failed: unexpected  aud  claim value",
    ],
    [
      "a token from another issuer",
      (key: CryptoKey) => sign(key, {}, { issuer: "https://other.test" }),
      // jose: `unexpected "iss" claim value`
      "Token verification failed: unexpected  iss  claim value",
    ],
    [
      "a token carrying no aud claim",
      (key: CryptoKey) =>
        new jose.SignJWT({})
          .setProtectedHeader({ alg: "RS256", kid: "test-key" })
          .setIssuer(ISSUER)
          .setExpirationTime("1h")
          .sign(key),
      // jose: `missing required "aud" claim`
      "Token verification failed: missing required  aud  claim",
    ],
  ])(
    "keeps the message safe inside the challenge for %s",
    async (_, mint, expected) => {
      const { privateKey, jwksUri } = await startJwks();
      const verifier = createJwksVerifier({
        issuer: ISSUER,
        audience: AUDIENCE,
        jwksUri,
      });

      const error = await verifier
        .verifyAccessToken(await mint(privateKey))
        .then(
          () => undefined,
          (e: Error) => e,
        );

      expect(error?.message).toBe(expected);
      // OAuth 2.1 §5.3.1: %x20-21 / %x23-5B / %x5D-7E and nothing else.
      expect(error?.message).not.toMatch(/[^\x20-\x21\x23-\x5B\x5D-\x7E]/);
    },
  );

  it("skips the aud check when no audience is configured (e.g. Clerk)", async () => {
    const { privateKey, jwksUri } = await startJwks();
    const verifier = createJwksVerifier({ issuer: ISSUER, jwksUri });
    // Clerk-shaped access token: no `aud` claim at all.
    const token = await new jose.SignJWT({ client_id: "c", sub: "u" })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(ISSUER)
      .setExpirationTime("1h")
      .sign(privateKey);

    const auth = await verifier.verifyAccessToken(token);
    expect(auth.clientId).toBe("c");
    expect(auth.extra?.subject).toBe("u");
  });

  it("parses array scope claims and trims extra whitespace", async () => {
    const { privateKey, jwksUri } = await startJwks();
    const verifier = createJwksVerifier({
      issuer: ISSUER,
      audience: AUDIENCE,
      jwksUri,
    });

    const arrayToken = await sign(privateKey, {
      scope: ["openid", "email"],
    });
    expect((await verifier.verifyAccessToken(arrayToken)).scopes).toEqual([
      "openid",
      "email",
    ]);

    const messyToken = await sign(privateKey, { scope: " openid  email " });
    expect((await verifier.verifyAccessToken(messyToken)).scopes).toEqual([
      "openid",
      "email",
    ]);
  });
});

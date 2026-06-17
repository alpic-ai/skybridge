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

  it("defaults missing scope to an empty array", async () => {
    const { privateKey, jwksUri } = await startJwks();
    const verifier = createJwksVerifier({
      issuer: ISSUER,
      audience: AUDIENCE,
      jwksUri,
    });
    const token = await sign(privateKey, { client_id: "c" });

    const auth = await verifier.verifyAccessToken(token);
    expect(auth.scopes).toEqual([]);
    expect(auth.clientId).toBe("c");
  });
});

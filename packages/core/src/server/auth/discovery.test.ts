// @vitest-environment node
import http from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { discoverAuthorizationServer } from "./discovery.js";

let server: http.Server | undefined;
afterEach(() => server?.close());

function doc(origin: string, extra: Record<string, unknown> = {}) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/authorize`,
    token_endpoint: `${origin}/token`,
    registration_endpoint: `${origin}/register`,
    response_types_supported: ["code"],
    scopes_supported: ["openid", "email"],
    jwks_uri: `${origin}/jwks`,
    ...extra,
  };
}

// Serves JSON bodies built from the live origin at their well-known paths;
// returns the origin URL.
async function serve(build: (origin: string) => Record<string, unknown>) {
  let origin = "";
  const srv = http.createServer((req, res) => {
    const body = build(origin)[req.url ?? ""];
    if (body === undefined) {
      res.writeHead(404).end();
      return;
    }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(body));
  });
  await new Promise<void>((resolve) => srv.listen(0, resolve));
  server = srv;
  origin = `http://localhost:${(srv.address() as { port: number }).port}`;
  return origin;
}

describe("discoverAuthorizationServer", () => {
  it("fetches and validates openid-configuration", async () => {
    const base = await serve((o) => ({
      "/.well-known/openid-configuration": doc(o),
    }));
    const meta = await discoverAuthorizationServer(base);
    expect(meta.registration_endpoint).toBe(`${base}/register`);
    expect(meta.jwks_uri).toBe(`${base}/jwks`);
  });

  it("accepts a canonically slash-terminated issuer", async () => {
    const base = await serve((o) => ({
      "/.well-known/openid-configuration": doc(o, { issuer: `${o}/` }),
    }));
    const meta = await discoverAuthorizationServer(base);
    expect(meta.registration_endpoint).toBe(`${base}/register`);
  });

  it("falls back to oauth-authorization-server when oidc is 404", async () => {
    const base = await serve((o) => ({
      "/.well-known/oauth-authorization-server": doc(o),
    }));
    const meta = await discoverAuthorizationServer(base);
    expect(meta.registration_endpoint).toBe(`${base}/register`);
  });

  it("throws when no well-known doc is reachable", async () => {
    const base = await serve(() => ({}));
    await expect(discoverAuthorizationServer(base)).rejects.toThrow(
      /discovery failed/i,
    );
  });

  it("rejects a doc whose issuer does not match the fetch origin", async () => {
    const base = await serve(() => ({
      "/.well-known/openid-configuration": doc("https://evil.test"),
    }));
    await expect(discoverAuthorizationServer(base)).rejects.toThrow(
      /discovery failed/i,
    );
  });
});

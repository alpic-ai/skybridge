// @vitest-environment node
import http from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { discoverAuthorizationServer } from "./discovery.js";

let server: http.Server | undefined;
afterEach(() => server?.close());

const DOC = {
  issuer: "https://idp.test",
  authorization_endpoint: "https://idp.test/authorize",
  token_endpoint: "https://idp.test/token",
  registration_endpoint: "https://idp.test/register",
  response_types_supported: ["code"],
  scopes_supported: ["openid", "email"],
  jwks_uri: "https://idp.test/jwks",
};

// Serves the given bodies at their well-known paths; returns the origin URL.
async function serve(routes: Record<string, unknown>) {
  const srv = http.createServer((req, res) => {
    const body = routes[req.url ?? ""];
    if (body === undefined) {
      res.writeHead(404).end();
      return;
    }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(body));
  });
  await new Promise<void>((resolve) => srv.listen(0, resolve));
  server = srv;
  const port = (srv.address() as { port: number }).port;
  return `http://localhost:${port}`;
}

describe("discoverAuthorizationServer", () => {
  it("fetches and validates openid-configuration", async () => {
    const base = await serve({ "/.well-known/openid-configuration": DOC });
    const meta = await discoverAuthorizationServer(base);
    expect(meta.registration_endpoint).toBe("https://idp.test/register");
    expect(meta.jwks_uri).toBe("https://idp.test/jwks");
  });

  it("falls back to oauth-authorization-server when oidc is 404", async () => {
    const base = await serve({
      "/.well-known/oauth-authorization-server": DOC,
    });
    const meta = await discoverAuthorizationServer(base);
    expect(meta.registration_endpoint).toBe("https://idp.test/register");
  });

  it("throws when no well-known doc is reachable", async () => {
    const base = await serve({});
    await expect(discoverAuthorizationServer(base)).rejects.toThrow(
      /discovery failed/i,
    );
  });

  it("falls through to oauth-authorization-server when oidc doc is schema-invalid", async () => {
    const invalidDoc = { ...DOC };
    delete (invalidDoc as Partial<typeof DOC>).response_types_supported;
    const base = await serve({
      "/.well-known/openid-configuration": invalidDoc,
      "/.well-known/oauth-authorization-server": DOC,
    });
    const meta = await discoverAuthorizationServer(base);
    expect(meta.registration_endpoint).toBe("https://idp.test/register");
  });

  it("treats a 200 non-JSON body as unreachable and throws discovery failed", async () => {
    const srv = http.createServer((_req, res) => {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<html>nope</html>");
    });
    await new Promise<void>((resolve) => srv.listen(0, resolve));
    server = srv;
    const port = (srv.address() as { port: number }).port;
    const base = `http://localhost:${port}`;
    await expect(discoverAuthorizationServer(base)).rejects.toThrow(
      /discovery failed/i,
    );
  });
});

// @vitest-environment node
import http from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { RequestHandler } from "express";
import * as jose from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { McpServer } from "../server.js";

vi.mock("@skybridge/devtools", () => ({
  devtoolsStaticServer: () =>
    ((_req: unknown, _res: unknown, next: () => void) =>
      next()) as RequestHandler,
}));
vi.mock("../viewsDevServer.js", () => ({
  viewsDevServer: (_httpServer: unknown) =>
    ((_req: unknown, _res: unknown, next: () => void) =>
      next()) as RequestHandler,
}));

const ISSUER = "https://issuer.test";
const AUDIENCE = "api://default";

let jwksServer: http.Server | undefined;
let appServer: http.Server | undefined;
afterEach(() => {
  jwksServer?.close();
  appServer?.close();
});

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

function signToken(key: CryptoKey) {
  return new jose.SignJWT({
    client_id: "client-1",
    scope: "openid email",
    sub: "user-1",
  })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime("1h")
    .sign(key);
}

// Builds an oauth-configured server with an echo tool that returns authInfo,
// boots it on a random port, and returns the base URL.
async function bootServer(
  jwksUri: string,
  {
    baseUrl = "https://app.example.test",
    enforcement = "required",
  }: { baseUrl?: string; enforcement?: "required" | "optional" } = {},
) {
  const { createApp } = await import("../express.js");
  const server = new McpServer(
    { name: "auth-test", version: "0.0.0" },
    { capabilities: {} },
    {
      oauth: {
        baseUrl,
        oauthMetadata: {
          issuer: ISSUER,
          authorization_endpoint: `${ISSUER}/authorize`,
          token_endpoint: `${ISSUER}/token`,
          response_types_supported: ["code"],
        },
        verify: { issuer: ISSUER, audience: AUDIENCE, jwksUri },
        scopesSupported: ["openid", "email"],
        requiredScopes: ["openid"],
        enforcement,
      },
    },
  ).registerTool(
    {
      name: "whoami",
      description: "Returns the caller identity.",
      inputSchema: {},
    },
    (_args, extra) => ({
      structuredContent: { clientId: extra.authInfo?.clientId ?? null },
      content: [{ type: "text", text: extra.authInfo?.clientId ?? "anon" }],
    }),
  );

  const httpServer = http.createServer();
  await createApp({ mcpServer: server, httpServer });
  const listening = http.createServer(server.express);
  await new Promise<void>((resolve) => listening.listen(0, resolve));
  appServer = listening;
  const port = (listening.address() as { port: number }).port;
  return `http://localhost:${port}`;
}

describe("setupOAuth wiring", () => {
  it("serves protected-resource metadata", async () => {
    const { jwksUri } = await startJwks();
    const base = await bootServer(jwksUri);

    const res = await fetch(`${base}/.well-known/oauth-protected-resource`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      resource: string;
      authorization_servers: string[];
      scopes_supported: string[];
    };
    expect(body.resource).toBe("https://app.example.test/");
    expect(body.authorization_servers).toContain(ISSUER);
    expect(body.scopes_supported).toEqual(["openid", "email"]);
  });

  it("serves authorization-server metadata", async () => {
    const { jwksUri } = await startJwks();
    const base = await bootServer(jwksUri);

    const res = await fetch(`${base}/.well-known/oauth-authorization-server`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { issuer: string };
    expect(body.issuer).toBe(ISSUER);
  });

  it("rejects /mcp without a token (401 + WWW-Authenticate)", async () => {
    const { jwksUri } = await startJwks();
    const base = await bootServer(jwksUri);

    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1 }),
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toMatch(/resource_metadata=/);
  });

  it("threads authInfo into the tool handler for a valid token", async () => {
    const { privateKey, jwksUri } = await startJwks();
    const base = await bootServer(jwksUri);
    const token = await signToken(privateKey);

    const client = new Client({ name: "test-client", version: "0.0.0" });
    const transport = new StreamableHTTPClientTransport(
      new URL(`${base}/mcp`),
      { requestInit: { headers: { Authorization: `Bearer ${token}` } } },
    );
    await client.connect(transport);

    const result = (await client.callTool({
      name: "whoami",
      arguments: {},
    })) as unknown as {
      content: { type: string; text: string }[];
    };
    expect(result.content[0]?.text).toBe("client-1");

    await client.close();
  });
});

describe("enforcement: optional", () => {
  it("lets an anonymous /mcp request through", async () => {
    const { jwksUri } = await startJwks();
    const base = await bootServer(jwksUri, { enforcement: "optional" });

    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "initialize",
        id: 1,
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "anon", version: "0.0.0" },
        },
      }),
    });
    expect(res.status).toBe(200);
  });

  it("still rejects a malformed token", async () => {
    const { jwksUri } = await startJwks();
    const base = await bootServer(jwksUri, { enforcement: "optional" });

    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer not-a-real-token",
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1 }),
    });
    expect(res.status).toBe(401);
  });
});

describe("oauth config validation", () => {
  const validMetadata = {
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/authorize`,
    token_endpoint: `${ISSUER}/token`,
    response_types_supported: ["code"],
  };

  it("throws on a non-absolute baseUrl", () => {
    expect(
      () =>
        new McpServer({ name: "t", version: "0" }, undefined, {
          oauth: {
            baseUrl: "not-a-url",
            oauthMetadata: validMetadata,
            verify: { issuer: ISSUER, audience: AUDIENCE },
          },
        }),
    ).toThrow(/baseUrl must be a valid absolute URL/);
  });

  it("throws when verify.audience is missing", () => {
    expect(
      () =>
        new McpServer({ name: "t", version: "0" }, undefined, {
          oauth: {
            baseUrl: "https://app.example.test",
            oauthMetadata: validMetadata,
            // @ts-expect-error intentionally missing audience
            verify: { issuer: ISSUER },
          },
        }),
    ).toThrow(/verify requires both `issuer` and `audience`/);
  });
});

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

function signToken(key: CryptoKey, scope = "openid email") {
  return new jose.SignJWT({
    client_id: "client-1",
    scope,
    sub: "user-1",
  })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime("1h")
    .sign(key);
}

async function bootServer(
  jwksUri: string,
  { baseUrl = "https://app.example.test" }: { baseUrl?: string | null } = {},
) {
  const { createApp } = await import("../express.js");
  const server = new McpServer(
    { name: "auth-test", version: "0.0.0" },
    { capabilities: {} },
    {
      oauth: {
        ...(baseUrl === null ? {} : { baseUrl }),
        oauthMetadata: {
          issuer: ISSUER,
          authorization_endpoint: `${ISSUER}/authorize`,
          token_endpoint: `${ISSUER}/token`,
          response_types_supported: ["code"],
        },
        verify: { issuer: ISSUER, audience: AUDIENCE, jwksUri },
        scopesSupported: ["openid", "email"],
        requiredScopes: ["openid"],
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

describe("baseUrl inferred from headers", () => {
  it("derives the resource origin from x-forwarded-host", async () => {
    const { jwksUri } = await startJwks();
    const base = await bootServer(jwksUri, { baseUrl: null });

    const res = await fetch(`${base}/.well-known/oauth-protected-resource`, {
      headers: { "x-forwarded-host": "infer.example.test" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { resource: string };
    expect(body.resource).toBe("https://infer.example.test/");
  });

  it("uses the first hop of a forwarded-host chain", async () => {
    const { jwksUri } = await startJwks();
    const base = await bootServer(jwksUri, { baseUrl: null });

    const res = await fetch(`${base}/.well-known/oauth-protected-resource`, {
      headers: {
        "x-forwarded-host": "public.example, internal.local",
        "x-forwarded-proto": "https, http",
      },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { resource: string };
    expect(body.resource).toBe("https://public.example/");
  });

  it("ignores the client Origin header, using Host instead", async () => {
    const { jwksUri } = await startJwks();
    const base = await bootServer(jwksUri, { baseUrl: null });

    const res = await fetch(`${base}/.well-known/oauth-protected-resource`, {
      headers: { origin: "https://chatgpt.com" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { resource: string };
    expect(body.resource).toMatch(/^http:\/\/(localhost|127\.0\.0\.1):/);
  });

  it("points the 401 WWW-Authenticate at the inferred host", async () => {
    const { jwksUri } = await startJwks();
    const base = await bootServer(jwksUri, { baseUrl: null });

    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-host": "infer.example.test",
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1 }),
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toMatch(
      /resource_metadata="https:\/\/infer\.example\.test\//,
    );
  });
});

async function bootMixedServer(jwksUri: string) {
  const { createApp } = await import("../express.js");
  const server = new McpServer(
    { name: "mixed-auth-test", version: "0.0.0" },
    { capabilities: {} },
    {
      oauth: {
        baseUrl: "https://app.example.test",
        oauthMetadata: {
          issuer: ISSUER,
          authorization_endpoint: `${ISSUER}/authorize`,
          token_endpoint: `${ISSUER}/token`,
          response_types_supported: ["code"],
        },
        verify: { issuer: ISSUER, audience: AUDIENCE, jwksUri },
      },
    },
  )
    .registerTool(
      {
        name: "public-whoami",
        description: "Public.",
        inputSchema: {},
        auth: "public",
      },
      (_args, extra) => ({
        content: [{ type: "text", text: extra.authInfo?.clientId ?? "anon" }],
      }),
    )
    .registerTool(
      {
        name: "private-whoami",
        description: "Private.",
        inputSchema: {},
        auth: "required",
      },
      (_args, extra) => ({
        content: [{ type: "text", text: extra.authInfo?.clientId ?? "anon" }],
      }),
    );

  (server.registerTool as (...a: unknown[]) => unknown)(
    "legacy-whoami",
    {
      description: "Registered via the legacy string overload.",
      inputSchema: {},
    },
    (_args: unknown, extra: { authInfo?: { clientId?: string } }) => ({
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

describe("mixed-auth door", () => {
  it("lets an anonymous caller initialize and run a noauth tool", async () => {
    const { jwksUri } = await startJwks();
    const base = await bootMixedServer(jwksUri);

    const client = new Client({ name: "test-client", version: "0.0.0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${base}/mcp`)),
    );

    const result = (await client.callTool({
      name: "public-whoami",
      arguments: {},
    })) as unknown as { content: { text: string }[] };
    expect(result.content[0]?.text).toBe("anon");

    await client.close();
  });

  it("exposes securitySchemes at the top level of tools/list (not only _meta)", async () => {
    const { jwksUri } = await startJwks();
    const base = await bootMixedServer(jwksUri);
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    await fetch(`${base}/mcp`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "c", version: "0" },
        },
      }),
    });
    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
    });
    const text = await res.text();
    const json = JSON.parse((text.match(/\{[\s\S]*\}/) ?? ["{}"])[0]) as {
      result: { tools: Array<{ name: string; securitySchemes?: unknown }> };
    };
    const whoami = json.result.tools.find((t) => t.name === "private-whoami");
    expect(whoami?.securitySchemes).toEqual([{ type: "oauth2" }]);
  });

  it("denies a protected tool inside an anonymous JSON-RPC batch", async () => {
    const { jwksUri } = await startJwks();
    const base = await bootMixedServer(jwksUri);

    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify([
        {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "private-whoami", arguments: {} },
        },
      ]),
    });
    const text = await res.text();
    expect(text).not.toContain("client-1");
    expect(text).toContain("Sign in to use this tool.");
    expect(text).toContain("resource_metadata=");
  });

  it("gates a tool registered via the legacy string overload (secure default)", async () => {
    const { jwksUri } = await startJwks();
    const base = await bootMixedServer(jwksUri);

    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "legacy-whoami", arguments: {} },
      }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 + WWW-Authenticate for a protected tool while anonymous", async () => {
    const { jwksUri } = await startJwks();
    const base = await bootMixedServer(jwksUri);

    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "private-whoami", arguments: {} },
      }),
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toMatch(
      /error="invalid_token"/,
    );
    expect(res.headers.get("www-authenticate")).toMatch(/resource_metadata=/);
  });

  it("returns an in-band mcp/www_authenticate array to ChatGPT (not a transport 401)", async () => {
    const { jwksUri } = await startJwks();
    const base = await bootMixedServer(jwksUri);

    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "User-Agent": "openai-mcp/1.0",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 7,
        method: "tools/call",
        params: { name: "private-whoami", arguments: {} },
      }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("www-authenticate")).toBeNull();
    const body = (await res.json()) as {
      id: number;
      result: {
        isError: boolean;
        _meta: { "mcp/www_authenticate": string[] };
      };
    };
    expect(body.id).toBe(7);
    expect(body.result.isError).toBe(true);
    const challenge = body.result._meta["mcp/www_authenticate"];
    expect(Array.isArray(challenge)).toBe(true);
    expect(challenge[0]).toMatch(/error="invalid_token"/);
    expect(challenge[0]).toMatch(/resource_metadata=/);
  });
});

async function bootScopedServer(jwksUri: string) {
  const { createApp } = await import("../express.js");
  const server = new McpServer(
    { name: "scoped-auth-test", version: "0.0.0" },
    { capabilities: {} },
    {
      oauth: {
        baseUrl: "https://app.example.test",
        oauthMetadata: {
          issuer: ISSUER,
          authorization_endpoint: `${ISSUER}/authorize`,
          token_endpoint: `${ISSUER}/token`,
          response_types_supported: ["code"],
        },
        verify: { issuer: ISSUER, audience: AUDIENCE, jwksUri },
      },
    },
  ).registerTool(
    {
      name: "checkout",
      description: "Needs the checkout scope.",
      inputSchema: {},
      auth: { scopes: ["checkout"] },
    },
    () => ({ content: [{ type: "text", text: "ok" }] }),
  );

  const httpServer = http.createServer();
  await createApp({ mcpServer: server, httpServer });
  const listening = http.createServer(server.express);
  await new Promise<void>((resolve) => listening.listen(0, resolve));
  appServer = listening;
  const port = (listening.address() as { port: number }).port;
  return `http://localhost:${port}`;
}

describe("per-tool scope enforcement in fully-authenticated mode", () => {
  it("returns 403 for a valid token missing the tool's scope", async () => {
    const { privateKey, jwksUri } = await startJwks();
    const base = await bootScopedServer(jwksUri);
    const token = await signToken(privateKey, "openid");

    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "checkout", arguments: {} },
      }),
    });
    expect(res.status).toBe(403);
    const header = res.headers.get("www-authenticate");
    expect(header).toMatch(/error="insufficient_scope"/);
    expect(header).toMatch(/scope="checkout"/);
  });

  it("allows a token carrying the tool's scope", async () => {
    const { privateKey, jwksUri } = await startJwks();
    const base = await bootScopedServer(jwksUri);
    const token = await signToken(privateKey, "openid checkout");

    const client = new Client({ name: "test-client", version: "0.0.0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${base}/mcp`), {
        requestInit: { headers: { Authorization: `Bearer ${token}` } },
      }),
    );

    const result = (await client.callTool({
      name: "checkout",
      arguments: {},
    })) as unknown as { isError?: boolean; content: { text: string }[] };
    expect(result.content[0]?.text).toBe("ok");

    await client.close();
  });
});

describe("auth shorthand validation", () => {
  it("throws when `auth` is set but no oauth provider is configured", () => {
    expect(() =>
      new McpServer({ name: "t", version: "0" }).registerTool(
        { name: "x", inputSchema: {}, auth: "required" },
        () => ({ content: [{ type: "text", text: "" }] }),
      ),
    ).toThrow(/no `oauth` provider/);
  });

  it('allows `auth: "public"` without an oauth provider', () => {
    expect(() =>
      new McpServer({ name: "t", version: "0" }).registerTool(
        { name: "x", inputSchema: {}, auth: "public" },
        () => ({ content: [{ type: "text", text: "" }] }),
      ),
    ).not.toThrow();
  });

  it("prefers `securitySchemes` over `auth` when both are set", () => {
    expect(() =>
      new McpServer({ name: "t", version: "0" }).registerTool(
        {
          name: "x",
          inputSchema: {},
          auth: "required",
          securitySchemes: [{ type: "oauth2" }],
        },
        () => ({ content: [{ type: "text", text: "" }] }),
      ),
    ).not.toThrow();
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
});

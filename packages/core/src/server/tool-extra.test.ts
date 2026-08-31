// @vitest-environment node
import http from "node:http";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import type { RequestHandler } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Skybridge } from "./app.js";

vi.mock("@skybridge/devtools", () => ({
  devtoolsStaticServer: () =>
    ((_r: unknown, _s: unknown, n: () => void) => n()) as RequestHandler,
}));
vi.mock("./viewsDevServer.js", () => ({
  viewsDevServer: () =>
    ((_r: unknown, _s: unknown, n: () => void) => n()) as RequestHandler,
}));

let openServer: http.Server | undefined;
afterEach(() => openServer?.close());

describe("tool handler extra", () => {
  it("exposes the client hints the host sent on the request", async () => {
    const { createApp } = await import("./express.js");
    let seenLocale: unknown;
    const app = new Skybridge({ name: "t", version: "0.0.0" }, (server) =>
      server.registerTool(
        { name: "hints", description: "Reads client hints.", inputSchema: {} },
        (_args, extra) => {
          seenLocale = extra.mcpReq._meta?.["openai/locale"];
          return { content: [{ type: "text", text: "ok" }] };
        },
      ),
    );

    const httpServer = http.createServer();
    const expressApp = await createApp({ app, httpServer });
    const listening = http.createServer(expressApp);
    await new Promise<void>((r) => listening.listen(0, r));
    openServer = listening;
    const port = (listening.address() as { port: number }).port;

    const client = new Client({ name: "c", version: "0.0.0" });
    await client.connect(
      new StreamableHTTPClientTransport(
        new URL(`http://localhost:${port}/mcp`),
      ),
    );
    await client.callTool({
      name: "hints",
      arguments: {},
      _meta: { "openai/locale": "fr-FR" },
    });
    await client.close();

    expect(seenLocale).toBe("fr-FR");
  });
});

describe("stateless server instances", () => {
  it("carries the registered capabilities onto each per-request instance", async () => {
    const app = new Skybridge({ name: "t", version: "0.0.0" }, (server) =>
      server.registerTool(
        { name: "a-tool", description: "d", inputSchema: {} },
        () => ({ content: [{ type: "text", text: "ok" }] }),
      ),
    );

    const fresh = await app.createServerInstance();

    expect(fresh.getCapabilities().tools).toBeDefined();
  });

  it("serves a 2026-era caller with that era's result shape", async () => {
    const { createApp } = await import("./express.js");
    const app = new Skybridge({ name: "t", version: "0.0.0" }, (server) =>
      server.registerTool(
        {
          name: "scalar",
          description: "Returns a scalar structuredContent.",
          inputSchema: {},
          outputSchema: z.number(),
        },
        () => ({
          structuredContent: 42,
          content: [{ type: "text", text: "42" }],
        }),
      ),
    );

    const httpServer = http.createServer();
    const expressApp = await createApp({ app, httpServer });
    const listening = http.createServer(expressApp);
    await new Promise<void>((r) => listening.listen(0, r));
    openServer = listening;
    const port = (listening.address() as { port: number }).port;

    const client = new Client(
      { name: "c", version: "0.0.0" },
      { versionNegotiation: { mode: "auto" } },
    );
    await client.connect(
      new StreamableHTTPClientTransport(
        new URL(`http://localhost:${port}/mcp`),
      ),
    );
    const result = await client.callTool({ name: "scalar", arguments: {} });
    const negotiated = client.getNegotiatedProtocolVersion();
    await client.close();

    expect(negotiated).toBe("2026-07-28");
    expect(result.structuredContent).toBe(42);
  });
});

import http from "node:http";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Skybridge } from "./app.js";

vi.mock("@skybridge/devtools", () => ({
  devtoolsStaticServer: () =>
    ((_req: unknown, _res: unknown, next: () => void) =>
      next()) as RequestHandler,
}));

vi.mock("./viewsDevServer.js", () => ({
  viewsDevServer: (_httpServer: unknown) =>
    ((_req: unknown, _res: unknown, next: () => void) =>
      next()) as RequestHandler,
}));

async function listen(app: Parameters<typeof http.createServer>[1]) {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as { port: number }).port;
  return { port, server };
}

let openServer: http.Server | undefined;
afterEach(() => openServer?.close());

async function postMcp(port: number) {
  return fetch(`http://localhost:${port}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 1 }),
  });
}

async function postApi(port: number) {
  return fetch(`http://localhost:${port}/api/test`, { method: "POST" });
}

describe("Skybridge.express", () => {
  it("exposes a ready Express app immediately after construction", () => {
    const app = new Skybridge({
      name: "t",
      version: "0.0.0",
      handler: (server) => server,
    });
    expect(app.express).toBeDefined();
    expect(typeof app.express.use).toBe("function");
    expect(typeof app.express.get).toBe("function");
  });

  it("app.express.get registers a route reachable alongside /mcp", async () => {
    const { createApp } = await import("./express.js");
    const app = new Skybridge({
      name: "t",
      version: "0.0.0",
      handler: (server) => server,
    });
    app.express.get("/health", (_req, res) => {
      res.json({ status: "ok" });
    });

    const httpServer = http.createServer();
    await createApp({ app, httpServer });
    const { port, server: listening } = await listen(app.express);
    openServer = listening;

    const health = await fetch(`http://localhost:${port}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "ok" });

    // /mcp still works (POST returns 200/4xx, not 404)
    const mcp = await postMcp(port);
    expect(mcp.status).not.toBe(404);
  });

  it("app.use and app.express.use produce the same registration order", async () => {
    const { createApp } = await import("./express.js");
    const callsA: string[] = [];
    const callsB: string[] = [];

    const buildApp = () =>
      new Skybridge({
        name: "t",
        version: "0.0.0",
        handler: (server) => server,
      });

    const sA = buildApp();
    sA.use((_req, _res, next) => {
      callsA.push("first");
      next();
    });
    sA.express.use((_req, _res, next) => {
      callsA.push("second");
      next();
    });

    const sB = buildApp();
    sB.express.use((_req, _res, next) => {
      callsB.push("first");
      next();
    });
    sB.use((_req, _res, next) => {
      callsB.push("second");
      next();
    });

    for (const s of [sA, sB]) {
      s.express.get("/probe", (_req, res) => res.json({ ok: true }));
      const httpServer = http.createServer();
      await createApp({ app: s, httpServer });
      const { port, server: listening } = await listen(s.express);
      openServer = listening;
      await fetch(`http://localhost:${port}/probe`);
      listening.close();
    }

    expect(callsA).toEqual(["first", "second"]);
    expect(callsB).toEqual(["first", "second"]);
  });

  it("useOnError still wraps thrown /mcp errors after the route is mounted", async () => {
    const { createApp } = await import("./express.js");
    const app = new Skybridge({
      name: "t",
      version: "0.0.0",
      handler: (server) => server,
    });
    // Register the error handler BEFORE createApp — useOnError should still
    // apply it after /mcp, so /mcp errors hit it.
    const seen: string[] = [];
    app.useOnError((_err, _req, res, _next) => {
      seen.push("useOnError");
      res.status(503).json({ from: "useOnError" });
    });

    // Force the /mcp handler to throw so the error pipeline runs.
    app.use("/mcp", () => {
      throw new Error("boom");
    });

    const httpServer = http.createServer();
    await createApp({
      app,
      httpServer,
      // Mirror what run() does: forward the app's useOnError handlers
      // to createApp so they get applied after /mcp.
      // biome-ignore lint/complexity/useLiteralKeys: test mirrors run() internals to verify useOnError ordering
      errorMiddleware: app["errorMiddleware"],
    });
    const { port, server: listening } = await listen(app.express);
    openServer = listening;

    const res = await postMcp(port);
    expect(seen).toEqual(["useOnError"]);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ from: "useOnError" });
  });
});

describe("Skybridge JSON body parser options", () => {
  const largeBody = JSON.stringify({ data: "x".repeat(200 * 1024) });

  async function postEcho(port: number, body: string) {
    return fetch(`http://localhost:${port}/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  }

  it("forwards json options to express.json", async () => {
    const app = new Skybridge({
      name: "t",
      version: "0.0.0",
      json: { limit: "10mb" },
      handler: (server) => server,
    });
    app.express.post("/echo", (req, res) => {
      res.json({ received: req.body.data.length });
    });
    const { port, server: listening } = await listen(app.express);
    openServer = listening;

    const res = await postEcho(port, largeBody);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: 200 * 1024 });
  });

  it("keeps the default 100kb limit when no options are passed", async () => {
    const app = new Skybridge({
      name: "t",
      version: "0.0.0",
      handler: (server) => server,
    });
    app.express.post("/echo", (_req, res) => {
      res.json({ ok: true });
    });
    const { port, server: listening } = await listen(app.express);
    openServer = listening;

    const res = await postEcho(port, largeBody);
    expect(res.status).toBe(413);
  });
});

describe("createApp", () => {
  it("runs global custom middleware before the /mcp handler", async () => {
    const { createApp } = await import("./express.js");
    const calls: string[] = [];

    const mw: RequestHandler = (_req, _res, next) => {
      calls.push("custom");
      next();
    };

    const app = new Skybridge({
      name: "t",
      version: "0.0.0",
      handler: (server) => server,
    });
    app.use(mw);

    const httpServer = http.createServer();
    const expressApp = await createApp({ app, httpServer });

    const { port, server: httpListening } = await listen(expressApp);
    openServer = httpListening;

    await postMcp(port);
    expect(calls).toEqual(["custom"]);
  });

  it("runs path-scoped middleware on /mcp", async () => {
    const { createApp } = await import("./express.js");
    const calls: string[] = [];

    const mw: RequestHandler = (_req, _res, next) => {
      calls.push("auth");
      next();
    };

    const app = new Skybridge({
      name: "t",
      version: "0.0.0",
      handler: (server) => server,
    });
    app.use("/mcp", mw);

    const httpServer = http.createServer();
    const expressApp = await createApp({ app, httpServer });

    const { port, server: httpListening } = await listen(expressApp);
    openServer = httpListening;

    await postMcp(port);
    expect(calls).toEqual(["auth"]);
  });

  it("allows middleware to short-circuit with 401", async () => {
    const { createApp } = await import("./express.js");
    const calls: string[] = [];

    const reject: RequestHandler = (_req, res) => {
      calls.push("reject");
      res.status(401).json({ error: "Unauthorized" });
    };

    const app = new Skybridge({
      name: "t",
      version: "0.0.0",
      handler: (server) => server,
    });
    app.use("/mcp", reject);

    const httpServer = http.createServer();
    const expressApp = await createApp({ app, httpServer });

    const { port, server: httpListening } = await listen(expressApp);
    openServer = httpListening;

    const res = await postMcp(port);
    expect(calls).toEqual(["reject"]);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("runs multiple global middleware in registration order", async () => {
    const { createApp } = await import("./express.js");
    const calls: string[] = [];

    const mwA: RequestHandler = (_req, _res, next) => {
      calls.push("A");
      next();
    };
    const mwB: RequestHandler = (_req, _res, next) => {
      calls.push("B");
      next();
    };

    const app = new Skybridge({
      name: "t",
      version: "0.0.0",
      handler: (server) => server,
    });
    app.use(mwA);
    app.use(mwB);

    const httpServer = http.createServer();
    const expressApp = await createApp({ app, httpServer });

    const { port, server: httpListening } = await listen(expressApp);
    openServer = httpListening;

    await postMcp(port);
    expect(calls).toEqual(["A", "B"]);
  });

  it("path-scoped middleware does not run on non-matching paths", async () => {
    const { createApp } = await import("./express.js");
    const calls: string[] = [];

    const apiMw: RequestHandler = (_req, _res, next) => {
      calls.push("api");
      next();
    };

    const app = new Skybridge({
      name: "t",
      version: "0.0.0",
      handler: (server) => server,
    });
    app.use("/api", apiMw);

    const httpServer = http.createServer();
    const expressApp = await createApp({ app, httpServer });

    const { port, server: httpListening } = await listen(expressApp);
    openServer = httpListening;

    // Hit /mcp — the /api middleware should NOT fire
    await postMcp(port);
    expect(calls).toEqual([]);
  });

  it("supports Express Router via custom middleware", async () => {
    const { createApp } = await import("./express.js");
    const { Router } = await import("express");

    const router = Router();
    router.get("/health", (_req, res) => {
      res.json({ status: "ok" });
    });

    const app = new Skybridge({
      name: "t",
      version: "0.0.0",
      handler: (server) => server,
    });
    app.use(router as RequestHandler);

    const httpServer = http.createServer();
    const expressApp = await createApp({ app, httpServer });

    const { port, server: httpListening } = await listen(expressApp);
    openServer = httpListening;

    const res = await fetch(`http://localhost:${port}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("supports path-prefixed Router", async () => {
    const { createApp } = await import("./express.js");
    const { Router } = await import("express");

    const router = Router();
    router.get("/data", (_req, res) => {
      res.json({ value: 42 });
    });

    const app = new Skybridge({
      name: "t",
      version: "0.0.0",
      handler: (server) => server,
    });
    app.use("/api", router as RequestHandler);

    const httpServer = http.createServer();
    const expressApp = await createApp({ app, httpServer });

    const { port, server: httpListening } = await listen(expressApp);
    openServer = httpListening;

    const res = await fetch(`http://localhost:${port}/api/data`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ value: 42 });
  });

  it("server survives middleware errors without crashing", async () => {
    const { createApp } = await import("./express.js");

    const throwing: RequestHandler = () => {
      throw new Error("boom");
    };

    const app = new Skybridge({
      name: "t",
      version: "0.0.0",
      handler: (server) => server,
    });
    app.use("/explode", throwing);

    const httpServer = http.createServer();
    const expressApp = await createApp({ app, httpServer });

    const { port, server: httpListening } = await listen(expressApp);
    openServer = httpListening;

    const res = await fetch(`http://localhost:${port}/explode`);
    expect(res.status).toBe(500);

    // Server process did not crash — it still accepts connections
    const followUp = await fetch(`http://localhost:${port}/explode`);
    expect(followUp.status).toBe(500);
  });

  it("returns 500 JSON-RPC error when the MCP handler throws and no error middleware is registered", async () => {
    const { createApp } = await import("./express.js");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const app = new Skybridge({
      name: "t",
      version: "0.0.0",
      handler: (server) => server,
    });
    // Force the express-level error path: make a /mcp middleware throw so the
    // error pipeline runs and lands in the default /mcp error handler.
    app.use("/mcp", () => {
      throw new Error("boom");
    });

    const httpServer = http.createServer();
    const expressApp = await createApp({ app, httpServer });
    const { port, server: httpListening } = await listen(expressApp);
    openServer = httpListening;

    const res = await postMcp(port);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      jsonrpc: "2.0",
      error: { code: -32603, message: "Internal server error" },
      id: null,
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error handling MCP request:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("invokes a custom error handler when the MCP handler throws", async () => {
    const { createApp } = await import("./express.js");
    const calls: string[] = [];

    const errorHandler: ErrorRequestHandler = (_err, _req, res, _next) => {
      calls.push("error-handler");
      res.status(503).json({ custom: true });
    };

    const app = new Skybridge({
      name: "t",
      version: "0.0.0",
      handler: (server) => server,
    });
    app.use("/mcp", () => {
      throw new Error("boom");
    });

    const httpServer = http.createServer();
    const expressApp = await createApp({
      app,
      httpServer,
      errorMiddleware: [{ handlers: [errorHandler] }],
    });
    const { port, server: httpListening } = await listen(expressApp);
    openServer = httpListening;

    const res = await postMcp(port);
    expect(calls).toEqual(["error-handler"]);
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ custom: true });
  });

  it("invokes a path-scoped error handler only for matching routes", async () => {
    const { createApp } = await import("./express.js");
    const calls: string[] = [];

    const mcpErrorHandler: ErrorRequestHandler = (_err, _req, res, _next) => {
      calls.push("mcp-error-handler");
      res.status(503).json({ from: "mcp-error-handler" });
    };

    const throwingApiRoute: RequestHandler = (_req, _res, next) => {
      next(new Error("api error"));
    };

    const app = new Skybridge({
      name: "t",
      version: "0.0.0",
      handler: (server) => server,
    });
    app.use("/mcp", () => {
      throw new Error("boom");
    });
    app.use("/api/test", throwingApiRoute);

    const httpServer = http.createServer();
    const expressApp = await createApp({
      app,
      httpServer,
      errorMiddleware: [{ path: "/mcp", handlers: [mcpErrorHandler] }],
    });
    const { port, server: httpListening } = await listen(expressApp);
    openServer = httpListening;

    const mcpRes = await postMcp(port);
    expect(calls).toEqual(["mcp-error-handler"]);
    expect(mcpRes.status).toBe(503);
    expect(await mcpRes.json()).toEqual({ from: "mcp-error-handler" });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const apiRes = await postApi(port);
    expect(calls).toEqual(["mcp-error-handler"]);
    expect(apiRes.status).toBe(500);
    consoleSpy.mockRestore();
  });

  it("handles concurrent /mcp requests without 'Already connected to a transport'", async () => {
    const { createApp } = await import("./express.js");

    // Slow tool: keeps the underlying transport bound long enough to overlap
    // with concurrent requests, exposing the shared-McpServer race.
    const app = new Skybridge({
      name: "concurrent-test",
      version: "0.0.0",
      handler: (server) =>
        server.registerTool({ name: "slow", description: "slow" }, async () => {
          await new Promise((r) => setTimeout(r, 50));
          return { content: [{ type: "text" as const, text: "done" }] };
        }),
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const httpServer = http.createServer();
    const expressApp = await createApp({ app, httpServer });
    const { port, server } = await listen(expressApp);
    openServer = server;

    const callBody = (id: number) =>
      JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        id,
        params: { name: "slow", arguments: {} },
      });

    const N = 10;
    const responses = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        fetch(`http://localhost:${port}/mcp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
          },
          body: callBody(i + 1),
        }),
      ),
    );

    expect(responses.map((r) => r.status)).toEqual(Array(N).fill(200));
    expect(consoleSpy).not.toHaveBeenCalledWith(
      "Error handling MCP request:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});

describe("createApp Vercel mode", () => {
  it("app.run() returns the Express app without binding a port when VERCEL=1", async () => {
    const prevVercel = process.env.VERCEL;
    const prevEnv = process.env.NODE_ENV;
    process.env.VERCEL = "1";
    process.env.NODE_ENV = "production";
    try {
      vi.resetModules();
      const { Skybridge: Reloaded } = await import("./app.js");
      const app = new Reloaded({
        name: "t",
        version: "0.0.0",
        handler: (server) => server,
      });
      const result = await app.run();
      expect(typeof result).toBe("function");
      expect(result).toBe(app.express);
      const { port, server: listening } = await listen(app.express);
      openServer = listening;
      const res = await postMcp(port);
      expect(res.status).not.toBe(404);
    } finally {
      if (prevVercel === undefined) {
        delete process.env.VERCEL;
      } else {
        process.env.VERCEL = prevVercel;
      }
      process.env.NODE_ENV = prevEnv;
      vi.resetModules();
    }
  });
});

describe("createApp tunnel routes", () => {
  it("proxies POST /__skybridge/tunnel to the cli control server in dev mode", async () => {
    // Stand up a fake control listener that returns a known JSON body.
    const control = http.createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"status":"idle"}');
    });
    await new Promise<void>((resolve) =>
      control.listen(0, "127.0.0.1", resolve),
    );
    const controlAddr = control.address();
    if (typeof controlAddr === "string" || controlAddr === null) {
      control.close();
      throw new Error("control server has no address");
    }
    const controlPort = controlAddr.port;

    const prev = process.env.__TUNNEL_CONTROL_PORT;
    process.env.__TUNNEL_CONTROL_PORT = String(controlPort);
    try {
      const { createApp } = await import("./express.js");
      const app = new Skybridge({
        name: "t",
        version: "0.0.0",
        handler: (server) => server,
      });
      const httpServer = http.createServer();
      const expressApp = await createApp({ app, httpServer });
      const { port, server } = await listen(expressApp);
      openServer = server;

      const res = await fetch(`http://localhost:${port}/__skybridge/tunnel`, {
        method: "POST",
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: "idle" });
    } finally {
      if (prev === undefined) {
        delete process.env.__TUNNEL_CONTROL_PORT;
      } else {
        process.env.__TUNNEL_CONTROL_PORT = prev;
      }
      await new Promise<void>((resolve) => control.close(() => resolve()));
    }
  });

  it("does not expose /__skybridge/tunnel in production mode", async () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      vi.resetModules();
      const { createApp } = await import("./express.js");
      const { Skybridge: ReloadedSkybridge } = await import("./app.js");
      const app = new ReloadedSkybridge({
        name: "t",
        version: "0.0.0",
        handler: (server) => server,
      });
      const httpServer = http.createServer();
      const expressApp = await createApp({ app, httpServer });
      const { port, server } = await listen(expressApp);
      openServer = server;

      const res = await fetch(`http://localhost:${port}/__skybridge/tunnel`, {
        method: "POST",
      });
      expect(res.status).toBe(404);
    } finally {
      process.env.NODE_ENV = prevEnv;
      vi.resetModules();
    }
  });
});

describe("createApp mount path", () => {
  it("serves /mcp with the mount path intact on the request URL", async () => {
    const { createApp } = await import("./express.js");
    const app = new Skybridge({
      name: "t",
      version: "0.0.0",
      handler: (server) =>
        server.registerTool(
          {
            name: "echo-url",
            description: "Echoes the request URL.",
            inputSchema: {},
          },
          (_args, extra) => ({
            content: [{ type: "text", text: extra.http?.req?.url ?? "" }],
          }),
        ),
    });

    const httpServer = http.createServer();
    const expressApp = await createApp({ app, httpServer });
    const { port, server } = await listen(expressApp);
    openServer = server;

    const client = new Client({ name: "test-client", version: "0.0.0" });
    await client.connect(
      new StreamableHTTPClientTransport(
        new URL(`http://localhost:${port}/mcp`),
      ),
    );
    const result = (await client.callTool({
      name: "echo-url",
      arguments: {},
    })) as unknown as { content: { text: string }[] };
    await client.close();

    expect(new URL(result.content[0]?.text ?? "").pathname).toBe("/mcp");
  });
});

import http from "node:http";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { McpServer } from "./server.js";

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

const fakeServer = {} as McpServer;

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

describe("createApp", () => {
  it("runs global custom middleware before the /mcp handler", async () => {
    const { createApp } = await import("./express.js");
    const calls: string[] = [];

    const mw: RequestHandler = (_req, _res, next) => {
      calls.push("custom");
      next();
    };

    const httpServer = http.createServer();
    const app = await createApp({
      mcpServer: fakeServer,
      httpServer,
      customMiddleware: [{ handlers: [mw] }],
    });

    const { port, server } = await listen(app);
    openServer = server;

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

    const httpServer = http.createServer();
    const app = await createApp({
      mcpServer: fakeServer,
      httpServer,
      customMiddleware: [{ path: "/mcp", handlers: [mw] }],
    });

    const { port, server } = await listen(app);
    openServer = server;

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

    const httpServer = http.createServer();
    const app = await createApp({
      mcpServer: fakeServer,
      httpServer,
      customMiddleware: [{ path: "/mcp", handlers: [reject] }],
    });

    const { port, server } = await listen(app);
    openServer = server;

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

    const httpServer = http.createServer();
    const app = await createApp({
      mcpServer: fakeServer,
      httpServer,
      customMiddleware: [{ handlers: [mwA] }, { handlers: [mwB] }],
    });

    const { port, server } = await listen(app);
    openServer = server;

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

    const httpServer = http.createServer();
    const app = await createApp({
      mcpServer: fakeServer,
      httpServer,
      customMiddleware: [{ path: "/api", handlers: [apiMw] }],
    });

    const { port, server } = await listen(app);
    openServer = server;

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

    const httpServer = http.createServer();
    const app = await createApp({
      mcpServer: fakeServer,
      httpServer,
      customMiddleware: [{ handlers: [router as RequestHandler] }],
    });

    const { port, server } = await listen(app);
    openServer = server;

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

    const httpServer = http.createServer();
    const app = await createApp({
      mcpServer: fakeServer,
      httpServer,
      customMiddleware: [
        { path: "/api", handlers: [router as RequestHandler] },
      ],
    });

    const { port, server } = await listen(app);
    openServer = server;

    const res = await fetch(`http://localhost:${port}/api/data`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ value: 42 });
  });

  it("server survives middleware errors without crashing", async () => {
    const { createApp } = await import("./express.js");

    const throwing: RequestHandler = () => {
      throw new Error("boom");
    };

    const httpServer = http.createServer();
    const app = await createApp({
      mcpServer: fakeServer,
      httpServer,
      customMiddleware: [{ path: "/explode", handlers: [throwing] }],
    });

    const { port, server } = await listen(app);
    openServer = server;

    const res = await fetch(`http://localhost:${port}/explode`);
    expect(res.status).toBe(500);

    // Server process did not crash — it still accepts connections
    const followUp = await fetch(`http://localhost:${port}/explode`);
    expect(followUp.status).toBe(500);
  });

  it("returns 500 JSON-RPC error when the MCP handler throws and no error middleware is registered", async () => {
    const { createApp } = await import("./express.js");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const httpServer = http.createServer();
    const app = await createApp({ mcpServer: fakeServer, httpServer });
    const { port, server } = await listen(app);
    openServer = server;

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

    const httpServer = http.createServer();
    const app = await createApp({
      mcpServer: fakeServer,
      httpServer,
      errorMiddleware: [{ handlers: [errorHandler] }],
    });
    const { port, server } = await listen(app);
    openServer = server;

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

    const httpServer = http.createServer();
    const app = await createApp({
      mcpServer: fakeServer,
      httpServer,
      customMiddleware: [{ path: "/api/test", handlers: [throwingApiRoute] }],
      errorMiddleware: [{ path: "/mcp", handlers: [mcpErrorHandler] }],
    });
    const { port, server } = await listen(app);
    openServer = server;

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

    const mcpServer = new McpServer({
      name: "concurrent-test",
      version: "0.0.0",
    });
    // Slow tool: keeps the underlying transport bound long enough to overlap
    // with concurrent requests, exposing the shared-McpServer race.
    mcpServer.registerTool("slow", { description: "slow" }, async () => {
      await new Promise((r) => setTimeout(r, 50));
      return { content: [{ type: "text" as const, text: "done" }] };
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const httpServer = http.createServer();
    const app = await createApp({ mcpServer, httpServer });
    const { port, server } = await listen(app);
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

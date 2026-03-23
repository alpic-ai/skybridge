import http from "node:http";
import type { RequestHandler } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { McpServer } from "./server";

vi.mock("@skybridge/devtools", () => ({
  devtoolsStaticServer: () =>
    ((_req: unknown, _res: unknown, next: () => void) =>
      next()) as RequestHandler,
}));

vi.mock("./widgetsDevServer.js", () => ({
  widgetsDevServer: (_httpServer: unknown) =>
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

    const reject: RequestHandler = (_req, res) => {
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

    // Server still responds to other routes
    const health = await postMcp(port);
    expect(health.status).not.toBe(0);
  });
});

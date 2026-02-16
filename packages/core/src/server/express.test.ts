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
  widgetsDevServer: () =>
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

describe("createServer", () => {
  it("runs global custom middleware before the /mcp handler", async () => {
    const { createServer } = await import("./express.js");
    const calls: string[] = [];

    const mw: RequestHandler = (_req, _res, next) => {
      calls.push("custom");
      next();
    };

    const app = await createServer({
      server: fakeServer,
      customMiddleware: [{ handlers: [mw] }],
    });

    const { port, server } = await listen(app);
    openServer = server;

    await postMcp(port);
    expect(calls).toEqual(["custom"]);
  });

  it("runs path-scoped middleware on /mcp", async () => {
    const { createServer } = await import("./express.js");
    const calls: string[] = [];

    const mw: RequestHandler = (_req, _res, next) => {
      calls.push("auth");
      next();
    };

    const app = await createServer({
      server: fakeServer,
      customMiddleware: [{ path: "/mcp", handlers: [mw] }],
    });

    const { port, server } = await listen(app);
    openServer = server;

    await postMcp(port);
    expect(calls).toEqual(["auth"]);
  });

  it("allows middleware to short-circuit with 401", async () => {
    const { createServer } = await import("./express.js");

    const reject: RequestHandler = (_req, res) => {
      res.status(401).json({ error: "Unauthorized" });
    };

    const app = await createServer({
      server: fakeServer,
      customMiddleware: [{ path: "/mcp", handlers: [reject] }],
    });

    const { port, server } = await listen(app);
    openServer = server;

    const res = await postMcp(port);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });
});

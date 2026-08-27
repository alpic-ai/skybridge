// @vitest-environment node
import http from "node:http";
import type { RequestHandler } from "express";
import { afterEach, expect, it, vi } from "vitest";
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
afterEach(() => {
  openServer?.close();
  vi.restoreAllMocks();
});

it("reports a failure inside the MCP leg instead of swallowing it", async () => {
  const { createApp } = await import("./express.js");
  const app = new Skybridge(
    { name: "t", version: "0.0.0" },
    (server) => server,
  );
  vi.spyOn(app, "createServerInstance").mockImplementation(() => {
    throw new Error("boom");
  });
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});

  const httpServer = http.createServer();
  const expressApp = await createApp({ app, httpServer });
  const listening = http.createServer(expressApp);
  await new Promise<void>((r) => listening.listen(0, r));
  openServer = listening;
  const port = (listening.address() as { port: number }).port;

  const res = await fetch(`http://localhost:${port}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
  });

  expect(res.status).toBeGreaterThanOrEqual(500);
  expect(
    errors.mock.calls.some(([msg]) =>
      String(msg).includes("Error handling MCP request"),
    ),
  ).toBe(true);
});

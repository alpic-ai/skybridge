// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import {
  CLIENT_CAPABILITIES_META_KEY,
  PROTOCOL_VERSION_META_KEY,
  UnsupportedProtocolVersionError,
} from "@modelcontextprotocol/server";
import type { RequestHandler } from "express";
import { afterEach, expect, it, vi } from "vitest";
import { Skybridge } from "./app.js";
import { buildMcpHandler, createApp } from "./express.js";

vi.mock("@skybridge/devtools", () => ({
  devtoolsStaticServer: () =>
    ((_r: unknown, _s: unknown, n: () => void) => n()) as RequestHandler,
}));
vi.mock("./viewsDevServer.js", () => ({
  viewsDevServer: () =>
    ((_r: unknown, _s: unknown, n: () => void) => n()) as RequestHandler,
}));

const REJECTED = {
  headers: {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    "mcp-protocol-version": "client-supplied-text",
  },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
};

const UNSUPPORTED = {
  headers: {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {
      _meta: {
        [PROTOCOL_VERSION_META_KEY]: "2099-01-01",
        [CLIENT_CAPABILITIES_META_KEY]: {},
      },
    },
  }),
};

let openServer: http.Server | undefined;
afterEach(() => {
  openServer?.close();
  vi.restoreAllMocks();
});

function createTestApp() {
  return new Skybridge({
    name: "t",
    version: "0.0.0",
    handler: (server) => server,
  });
}

async function serve(options: {
  app?: Skybridge;
  mcpHandler?: ReturnType<typeof buildMcpHandler>;
  onMcpError?: (error: Error) => void;
}) {
  const expressApp = await createApp({
    app: options.app ?? createTestApp(),
    httpServer: http.createServer(),
    mcpHandler: options.mcpHandler,
    onMcpError: options.onMcpError,
  });
  const listening = http.createServer(expressApp);
  await new Promise<void>((r) => listening.listen(0, r));
  openServer = listening;
  return (listening.address() as AddressInfo).port;
}

function post(
  port: number,
  request: { headers: Record<string, string>; body: string },
) {
  return fetch(`http://localhost:${port}/mcp`, {
    method: "POST",
    headers: request.headers,
    body: request.body,
  });
}

it("reports a failure inside the MCP leg instead of swallowing it", async () => {
  const { createApp } = await import("./express.js");
  const app = new Skybridge({
    name: "t",
    version: "0.0.0",
    handler: (server) => server,
  });
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

it("logs a rejected request by default", async () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const port = await serve({});

  const res = await post(port, REJECTED);

  expect(res.status).toBe(400);
  expect(errors).toHaveBeenCalledTimes(1);
  const [prefix, error] = errors.mock.calls[0] ?? [];
  expect(prefix).toBe("Error handling MCP request:");
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toMatch(
    /^Rejected inbound request \(modern-header-without-claim\)/,
  );
});

it("skips the unsupported protocol version by default", async () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const port = await serve({});

  const res = await post(port, UNSUPPORTED);

  expect(res.status).toBe(400);
  expect((await res.json()).error.code).toBe(-32022);
  expect(errors).not.toHaveBeenCalled();
});

it("passes a rejected request to onMcpError instead of logging it", async () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const onMcpError = vi.fn();
  const port = await serve({ onMcpError });

  const res = await post(port, REJECTED);

  expect(res.status).toBe(400);
  expect(onMcpError).toHaveBeenCalledTimes(1);
  const [error] = onMcpError.mock.calls[0] ?? [];
  expect(error).toBeInstanceOf(Error);
  expect(error.message).toMatch(/^Rejected inbound request/);
  expect(errors).not.toHaveBeenCalled();
});

it("passes the unsupported protocol version to onMcpError", async () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const onMcpError = vi.fn();
  const port = await serve({ onMcpError });

  const res = await post(port, UNSUPPORTED);

  expect(res.status).toBe(400);
  expect((await res.json()).error.code).toBe(-32022);
  expect(onMcpError).toHaveBeenCalledTimes(1);
  expect(onMcpError.mock.calls[0]?.[0]).toBeInstanceOf(
    UnsupportedProtocolVersionError,
  );
  expect(errors).not.toHaveBeenCalled();
});

it("passes a server factory failure to onMcpError as the same error", async () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const onMcpError = vi.fn();
  const app = createTestApp();
  const boom = new Error("boom");
  vi.spyOn(app, "createServerInstance").mockImplementation(() => {
    throw boom;
  });
  const port = await serve({ app, onMcpError });

  const res = await post(port, {
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
  });

  expect(res.status).toBe(500);
  expect(onMcpError).toHaveBeenCalledTimes(1);
  expect(onMcpError.mock.calls[0]?.[0]).toBe(boom);
  expect(errors).not.toHaveBeenCalled();
});

it("passes a Node adapter failure to onMcpError", async () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const onMcpError = vi.fn();
  const app = createTestApp();
  const mcpHandler = buildMcpHandler(app);
  await mcpHandler.close();
  const port = await serve({ app, mcpHandler, onMcpError });

  const res = await post(port, REJECTED);

  expect(res.status).toBe(500);
  expect(onMcpError).toHaveBeenCalledTimes(1);
  expect(onMcpError.mock.calls[0]?.[0].message).toBe(
    "This MCP handler has been closed",
  );
  expect(errors).not.toHaveBeenCalled();
});

it("does not log a Node adapter failure by default", async () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const app = createTestApp();
  const mcpHandler = buildMcpHandler(app);
  await mcpHandler.close();
  const port = await serve({ app, mcpHandler });

  const res = await post(port, REJECTED);

  expect(res.status).toBe(500);
  expect(errors).not.toHaveBeenCalled();
});

it("wires onMcpError through run() on Node", async () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const onMcpError = vi.fn();
  const prevPort = process.env.__PORT;
  const prevSend = process.send;
  const sigterm = process.listeners("SIGTERM");
  const sigint = process.listeners("SIGINT");
  let runServer: http.Server | undefined;
  const realCreateServer = http.createServer.bind(http);
  vi.spyOn(http, "createServer").mockImplementation(((
    ...args: Parameters<typeof http.createServer>
  ) => {
    runServer = realCreateServer(...args);
    return runServer;
  }) as typeof http.createServer);
  process.env.__PORT = "0";
  if (process.send) {
    process.send = vi.fn() as unknown as typeof process.send;
  }
  try {
    const app = new Skybridge({
      name: "t",
      version: "0.0.0",
      onMcpError,
      handler: (server) => server,
    });
    await app.run();
    const { port } = (runServer as http.Server).address() as AddressInfo;

    const res = await post(port, REJECTED);

    expect(res.status).toBe(400);
    expect(onMcpError).toHaveBeenCalledTimes(1);
    expect(errors).not.toHaveBeenCalled();
  } finally {
    runServer?.close();
    for (const [signal, saved] of [
      ["SIGTERM", sigterm],
      ["SIGINT", sigint],
    ] as const) {
      for (const listener of process.listeners(signal)) {
        if (!saved.includes(listener)) {
          process.off(signal, listener);
        }
      }
    }
    if (prevPort === undefined) {
      delete process.env.__PORT;
    } else {
      process.env.__PORT = prevPort;
    }
    process.send = prevSend;
  }
});

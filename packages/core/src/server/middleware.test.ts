import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  buildMiddlewareChain,
  getHandlerMaps,
  type McpExtra,
  type McpMiddlewareEntry,
  type McpMiddlewareFn,
  matchesFilter,
} from "./middleware.js";
import { McpServer } from "./server.js";

// ---------------------------------------------------------------------------
// matchesFilter
// ---------------------------------------------------------------------------
describe("matchesFilter", () => {
  it("matches exact method", () => {
    expect(matchesFilter("tools/call", "tools/call", false)).toBe(true);
  });

  it("rejects non-matching exact method", () => {
    expect(matchesFilter("tools/list", "tools/call", false)).toBe(false);
  });

  it("matches wildcard", () => {
    expect(matchesFilter("tools/call", "tools/*", false)).toBe(true);
    expect(matchesFilter("tools/list", "tools/*", false)).toBe(true);
  });

  it("rejects non-matching wildcard", () => {
    expect(matchesFilter("resources/read", "tools/*", false)).toBe(false);
  });

  it('category "request" matches when isNotification=false', () => {
    expect(matchesFilter("tools/call", "request", false)).toBe(true);
  });

  it('category "request" rejects when isNotification=true', () => {
    expect(matchesFilter("notifications/initialized", "request", true)).toBe(
      false,
    );
  });

  it('category "notification" matches when isNotification=true', () => {
    expect(
      matchesFilter("notifications/initialized", "notification", true),
    ).toBe(true);
  });

  it('category "notification" rejects when isNotification=false', () => {
    expect(matchesFilter("tools/call", "notification", false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildMiddlewareChain
// ---------------------------------------------------------------------------
describe("buildMiddlewareChain", () => {
  const fakeExtra = {} as McpExtra;

  const makeHandler = (returnValue: unknown) => vi.fn(async () => returnValue);

  const makeEntry = (
    filter: McpMiddlewareEntry["filter"],
    handler: McpMiddlewareFn,
  ): McpMiddlewareEntry => ({ filter, handler });

  it("returns original handler when no middleware applies", () => {
    const original = makeHandler("result");
    const chain = buildMiddlewareChain("tools/call", false, original, [
      makeEntry("resources/*", async (_req, _extra, next) => next()),
    ]);
    expect(chain).toBe(original);
  });

  it("catch-all middleware runs for any method", async () => {
    const original = makeHandler("ok");
    const spy = vi.fn();
    const chain = buildMiddlewareChain("tools/call", false, original, [
      makeEntry(null, async (request, _extra, next) => {
        spy(request.method);
        return next();
      }),
    ]);
    const result = await chain({ method: "tools/call", params: {} }, fakeExtra);
    expect(spy).toHaveBeenCalledWith("tools/call");
    expect(result).toBe("ok");
  });

  it("method-scoped middleware only runs for matching methods", async () => {
    const original = makeHandler("ok");
    const spy = vi.fn();
    const entries = [
      makeEntry("tools/call", async (_req, _extra, next) => {
        spy("tools/call");
        return next();
      }),
    ];

    // Matching
    const chain1 = buildMiddlewareChain("tools/call", false, original, entries);
    await chain1({ method: "tools/call", params: {} }, fakeExtra);
    expect(spy).toHaveBeenCalledTimes(1);

    // Non-matching — returns original handler directly
    const chain2 = buildMiddlewareChain("tools/list", false, original, entries);
    expect(chain2).toBe(original);
  });

  it("executes middleware in registration order (onion model)", async () => {
    const calls: string[] = [];
    const original = makeHandler("result");

    const chain = buildMiddlewareChain("tools/call", false, original, [
      makeEntry(null, async (_req, _extra, next) => {
        calls.push("A:before");
        const result = await next();
        calls.push("A:after");
        return result;
      }),
      makeEntry(null, async (_req, _extra, next) => {
        calls.push("B:before");
        const result = await next();
        calls.push("B:after");
        return result;
      }),
    ]);

    await chain({ method: "tools/call", params: {} }, fakeExtra);
    expect(calls).toEqual(["A:before", "B:before", "B:after", "A:after"]);
  });

  it("short-circuit (no next() call) skips handler", async () => {
    const original = makeHandler("original");
    const chain = buildMiddlewareChain("tools/call", false, original, [
      makeEntry(null, async () => "short-circuited"),
    ]);
    const result = await chain({ method: "tools/call", params: {} }, fakeExtra);
    expect(result).toBe("short-circuited");
    expect(original).not.toHaveBeenCalled();
  });

  it("middleware can modify result post-next()", async () => {
    const original = makeHandler({ value: 1 });
    const chain = buildMiddlewareChain("tools/call", false, original, [
      makeEntry(null, async (_req, _extra, next) => {
        const result = (await next()) as { value: number };
        return { value: result.value + 10 };
      }),
    ]);
    const result = await chain({ method: "tools/call", params: {} }, fakeExtra);
    expect(result).toEqual({ value: 11 });
  });

  it("throws on double next() call", async () => {
    const original = makeHandler("ok");
    const chain = buildMiddlewareChain("tools/call", false, original, [
      makeEntry(null, async (_req, _extra, next) => {
        await next();
        return next(); // double call
      }),
    ]);
    await expect(
      chain({ method: "tools/call", params: {} }, fakeExtra),
    ).rejects.toThrow("next() called multiple times");
  });

  it("propagates errors from handler and middleware", async () => {
    // Error from original handler bubbles through middleware
    const failingHandler = vi.fn(async () => {
      throw new Error("handler boom");
    });
    const chain1 = buildMiddlewareChain("tools/call", false, failingHandler, [
      makeEntry(null, async (_req, _extra, next) => next()),
    ]);
    await expect(
      chain1({ method: "tools/call", params: {} }, fakeExtra),
    ).rejects.toThrow("handler boom");

    // Error thrown inside middleware propagates
    const chain2 = buildMiddlewareChain(
      "tools/call",
      false,
      makeHandler("ok"),
      [
        makeEntry(null, async () => {
          throw new Error("middleware boom");
        }),
      ],
    );
    await expect(
      chain2({ method: "tools/call", params: {} }, fakeExtra),
    ).rejects.toThrow("middleware boom");
  });

  it("passes extra as undefined for notifications (isNotification=true)", async () => {
    const original = makeHandler(undefined);
    let capturedExtra: McpExtra | undefined = {} as McpExtra;
    const chain = buildMiddlewareChain(
      "notifications/initialized",
      true,
      original,
      [
        makeEntry(null, async (_req, extra, next) => {
          capturedExtra = extra;
          return next();
        }),
      ],
    );
    await chain({ method: "notifications/initialized" });
    expect(capturedExtra).toBeUndefined();
  });

  it("defaults params to empty object when rawRequest has no params", async () => {
    const original = makeHandler("ok");
    let capturedParams: Record<string, unknown> | undefined;
    const chain = buildMiddlewareChain("tools/call", false, original, [
      makeEntry(null, async (request, _extra, next) => {
        capturedParams = request.params;
        return next();
      }),
    ]);
    await chain({ method: "tools/call" }, fakeExtra);
    expect(capturedParams).toEqual({});
  });

  it("propagates in-place param mutation to original handler", async () => {
    let handlerReceivedName = "";
    const original = vi.fn(async (rawReq: { params: { name: string } }) => {
      handlerReceivedName = rawReq.params.name;
      return "ok";
    });

    const chain = buildMiddlewareChain(
      "tools/call",
      false,
      original as unknown as (...args: unknown[]) => Promise<unknown>,
      [
        makeEntry(null, async (request, _extra, next) => {
          request.params.name = "mutated";
          return next();
        }),
      ],
    );

    await chain({ params: { name: "original" } }, fakeExtra);
    expect(handlerReceivedName).toBe("mutated");
  });

  it("propagates full param replacement to original handler", async () => {
    let handlerReceivedParams: Record<string, unknown> = {};
    const original = vi.fn(
      async (rawReq: { params: Record<string, unknown> }) => {
        handlerReceivedParams = rawReq.params;
        return "ok";
      },
    );

    const chain = buildMiddlewareChain(
      "tools/call",
      false,
      original as unknown as (...args: unknown[]) => Promise<unknown>,
      [
        makeEntry(null, async (request, _extra, next) => {
          request.params = { replaced: true };
          return next();
        }),
      ],
    );

    await chain({ params: { original: true } }, fakeExtra);
    expect(handlerReceivedParams).toEqual({ replaced: true });
  });
});

// ---------------------------------------------------------------------------
// McpServer.mcpMiddleware() integration tests
// ---------------------------------------------------------------------------
describe("McpServer.mcpMiddleware()", () => {
  function createClient() {
    return new Client({ name: "test-client", version: "1.0.0" });
  }

  it("returns this for chaining", () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    const result = server.mcpMiddleware(async (_req, _extra, next) => next());
    expect(result).toBe(server);
  });

  it("intercepts tools/call and exposes request params", async () => {
    let capturedMethod = "";
    let capturedParams: Record<string, unknown> = {};

    const server = new McpServer({ name: "test", version: "1.0.0" });

    server.registerTool(
      "greet",
      {
        description: "greet",
        inputSchema: { name: z.string() },
      },
      (args) => ({
        content: [{ type: "text" as const, text: `hi ${args.name}` }],
      }),
    );

    server.mcpMiddleware("tools/call", async (request, _extra, next) => {
      capturedMethod = request.method;
      capturedParams = request.params;
      return next();
    });

    const client = createClient();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const result = await client.callTool({
      name: "greet",
      arguments: { name: "World" },
    });
    expect(capturedMethod).toBe("tools/call");
    expect(capturedParams).toMatchObject({
      name: "greet",
      arguments: { name: "World" },
    });
    expect(result.content).toEqual([{ type: "text", text: "hi World" }]);

    await client.close();
    await server.close();
  });

  it("array filter works", async () => {
    const matchedMethods: string[] = [];

    const server = new McpServer({ name: "test", version: "1.0.0" });

    server.registerTool("t1", { description: "t1" }, () => ({
      content: [{ type: "text" as const, text: "ok" }],
    }));

    server.mcpMiddleware(
      ["tools/call", "tools/list"],
      async (request, _extra, next) => {
        matchedMethods.push(request.method);
        return next();
      },
    );

    const client = createClient();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    await client.listTools();
    await client.callTool({ name: "t1" });

    expect(matchedMethods).toEqual(["tools/list", "tools/call"]);

    await client.close();
    await server.close();
  });

  it("throws if registered after connect()", async () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });

    const [_clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    expect(() =>
      server.mcpMiddleware(async (_req, _extra, next) => next()),
    ).toThrow("Cannot register MCP middleware after run() or connect()");

    await server.close();
  });

  it("throws when filter provided without handler", () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    expect(() =>
      // @ts-expect-error intentionally passing filter without handler
      server.mcpMiddleware("tools/call"),
    ).toThrow("mcpMiddleware requires a handler function");
  });

  it("catch-all middleware + filtered middleware stack correctly", async () => {
    const calls: string[] = [];

    const server = new McpServer({ name: "test", version: "1.0.0" });

    server.registerTool("t1", { description: "t1" }, () => ({
      content: [{ type: "text" as const, text: "ok" }],
    }));

    server
      .mcpMiddleware(async (request, _extra, next) => {
        calls.push(`global:${request.method}`);
        return next();
      })
      .mcpMiddleware("tools/call", async (_req, _extra, next) => {
        calls.push("tools-only");
        return next();
      });

    const client = createClient();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    await client.listTools();
    await client.callTool({ name: "t1" });

    // Catch-all also intercepts initialize + notifications/initialized from handshake.
    // tools/list: only global middleware runs
    // tools/call: global + tools-only both run
    expect(calls).toContain("global:tools/list");
    expect(calls).toContain("global:tools/call");
    expect(calls).toContain("tools-only");
    // "tools-only" must come right after "global:tools/call"
    const toolsCallIdx = calls.indexOf("global:tools/call");
    expect(calls[toolsCallIdx + 1]).toBe("tools-only");

    await client.close();
    await server.close();
  });

  it("notification middleware receives extra as undefined", async () => {
    let capturedExtra: unknown = "sentinel";

    const server = new McpServer({ name: "test", version: "1.0.0" });

    server.registerTool("t1", { description: "t1" }, () => ({
      content: [{ type: "text" as const, text: "ok" }],
    }));

    server.mcpMiddleware("notification", async (_request, extra, next) => {
      capturedExtra = extra;
      return next();
    });

    const client = createClient();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    // The client sends notifications/initialized automatically on connect.
    await client.listTools();
    expect(capturedExtra).toBeUndefined();

    await client.close();
    await server.close();
  });

  it("category 'request' filter matches requests but not notifications", async () => {
    const matchedMethods: string[] = [];

    const server = new McpServer({ name: "test", version: "1.0.0" });

    server.registerTool("t1", { description: "t1" }, () => ({
      content: [{ type: "text" as const, text: "ok" }],
    }));

    server.mcpMiddleware("request", async (request, _extra, next) => {
      matchedMethods.push(request.method);
      return next();
    });

    const client = createClient();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    await client.listTools();
    await client.callTool({ name: "t1" });

    expect(matchedMethods).toContain("tools/list");
    expect(matchedMethods).toContain("tools/call");
    expect(matchedMethods).not.toContain("notifications/initialized");

    await client.close();
    await server.close();
  });
});

// ---------------------------------------------------------------------------
// getHandlerMaps
// ---------------------------------------------------------------------------
describe("getHandlerMaps", () => {
  it("throws for incompatible server objects", () => {
    // Empty object
    expect(() => getHandlerMaps({} as never)).toThrow(
      "Incompatible MCP SDK version",
    );
    // Only _requestHandlers (missing _notificationHandlers)
    expect(() =>
      getHandlerMaps({ _requestHandlers: new Map() } as never),
    ).toThrow("Incompatible MCP SDK version");
    // Non-Map values
    expect(() =>
      getHandlerMaps({
        _requestHandlers: {},
        _notificationHandlers: {},
      } as never),
    ).toThrow("Incompatible MCP SDK version");
  });

  it("returns handler maps from valid server", () => {
    const reqMap = new Map();
    const notifMap = new Map();
    const fake = {
      _requestHandlers: reqMap,
      _notificationHandlers: notifMap,
    };
    const result = getHandlerMaps(fake as never);
    expect(result.requestHandlers).toBe(reqMap);
    expect(result.notificationHandlers).toBe(notifMap);
  });
});

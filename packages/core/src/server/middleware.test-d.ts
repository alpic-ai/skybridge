import type {
  CallToolResult,
  ListToolsResult,
  ServerResult,
} from "@modelcontextprotocol/sdk/types.js";
import { expectTypeOf, test } from "vitest";
import type {
  McpExtra,
  McpResultFor,
  McpTypedMiddlewareFn,
} from "./middleware.js";
import type { McpServer } from "./server.js";

const server = null as unknown as McpServer;

test("request category narrows extra and next() result", () => {
  server.mcpMiddleware("request", async (_request, extra, next) => {
    expectTypeOf(extra).toEqualTypeOf<McpExtra>();
    extra.signal;
    const result = await next();
    expectTypeOf(result).toEqualTypeOf<ServerResult>();
    return result;
  });
});

test("notification category narrows extra and next() result", () => {
  server.mcpMiddleware("notification", async (_request, extra, next) => {
    expectTypeOf(extra).toEqualTypeOf<undefined>();
    // @ts-expect-error extra is undefined, cannot access .signal
    extra.signal;
    const result = await next();
    expectTypeOf(result).toEqualTypeOf<undefined>();
  });
});

test("exact method tools/call narrows params, extra, and next() result", () => {
  server.mcpMiddleware("tools/call", async (request, extra, next) => {
    expectTypeOf(request.params.name).toBeString();
    expectTypeOf(extra).toEqualTypeOf<McpExtra>();
    const result = await next();
    expectTypeOf(result).toEqualTypeOf<CallToolResult>();
    return result;
  });
});

test("exact method tools/list narrows next() to ListToolsResult", () => {
  server.mcpMiddleware("tools/list", async (_request, _extra, next) => {
    const result = await next();
    expectTypeOf(result).toEqualTypeOf<ListToolsResult>();
    return result;
  });
});

test("exact notification method narrows extra and next() result", () => {
  server.mcpMiddleware(
    "notifications/initialized",
    async (_request, extra, next) => {
      expectTypeOf(extra).toEqualTypeOf<undefined>();
      // @ts-expect-error extra is undefined
      extra.signal;
      const result = await next();
      expectTypeOf(result).toEqualTypeOf<undefined>();
    },
  );
});

test("McpTypedMiddlewareFn narrows params, extra, and next() per method", () => {
  expectTypeOf<
    Parameters<McpTypedMiddlewareFn<"tools/call">>[0]["params"]["name"]
  >().toBeString();
  expectTypeOf<
    Parameters<McpTypedMiddlewareFn<"tools/call">>[1]
  >().toEqualTypeOf<McpExtra>();
  expectTypeOf<
    Parameters<McpTypedMiddlewareFn<"notifications/initialized">>[1]
  >().toEqualTypeOf<undefined>();
  expectTypeOf<
    ReturnType<Parameters<McpTypedMiddlewareFn<"tools/list">>[2]>
  >().toEqualTypeOf<Promise<ListToolsResult>>();
  expectTypeOf<
    ReturnType<Parameters<McpTypedMiddlewareFn<"notifications/initialized">>[2]>
  >().toEqualTypeOf<Promise<undefined>>();
});

test("McpResultFor maps methods to correct result types", () => {
  expectTypeOf<McpResultFor<"tools/list">>().toEqualTypeOf<ListToolsResult>();
  expectTypeOf<McpResultFor<"tools/call">>().toEqualTypeOf<CallToolResult>();
  expectTypeOf<
    McpResultFor<"notifications/initialized">
  >().toEqualTypeOf<undefined>();
});

test("wildcard tools/* narrows next() to union of tools result types", () => {
  server.mcpMiddleware("tools/*", async (_request, _extra, next) => {
    const result = await next();
    expectTypeOf(result).toEqualTypeOf<ListToolsResult | CallToolResult>();
    return result;
  });
});

test("McpResultFor resolves wildcards to union of matching result types", () => {
  expectTypeOf<McpResultFor<"tools/*">>().toEqualTypeOf<
    ListToolsResult | CallToolResult
  >();
});

test("catch-all middleware has no narrowing on extra or params", () => {
  server.mcpMiddleware((_request, extra, next) => {
    expectTypeOf(extra).toEqualTypeOf<McpExtra | undefined>();
    expectTypeOf(_request.params).toEqualTypeOf<Record<string, unknown>>();
    return next();
  });
});

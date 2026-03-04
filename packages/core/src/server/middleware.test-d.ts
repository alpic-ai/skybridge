import { expectTypeOf, test } from "vitest";
import type { McpExtra, McpTypedMiddlewareFn } from "./middleware.js";
import type { McpServer } from "./server.js";

const server = null as unknown as McpServer;

test("request category narrows extra to McpExtra", () => {
  server.mcpMiddleware("request", (_request, extra, next) => {
    expectTypeOf(extra).toEqualTypeOf<McpExtra>();
    extra.signal;
    return next();
  });
});

test("notification category narrows extra to undefined", () => {
  server.mcpMiddleware("notification", (_request, extra, next) => {
    expectTypeOf(extra).toEqualTypeOf<undefined>();
    // @ts-expect-error extra is undefined, cannot access .signal
    extra.signal;
    return next();
  });
});

test("exact method tools/call narrows params and extra", () => {
  server.mcpMiddleware("tools/call", (request, extra, next) => {
    expectTypeOf(request.params.name).toBeString();
    expectTypeOf(extra).toEqualTypeOf<McpExtra>();
    return next();
  });
});

test("exact method tools/list narrows extra to McpExtra", () => {
  server.mcpMiddleware("tools/list", (_request, extra, next) => {
    expectTypeOf(extra).toEqualTypeOf<McpExtra>();
    return next();
  });
});

test("exact notification method narrows extra to undefined", () => {
  server.mcpMiddleware("notifications/initialized", (_request, extra, next) => {
    expectTypeOf(extra).toEqualTypeOf<undefined>();
    // @ts-expect-error extra is undefined
    extra.signal;
    return next();
  });
});

test("McpTypedMiddlewareFn narrows params and extra per method", () => {
  expectTypeOf<McpTypedMiddlewareFn<"tools/call">>().toBeFunction();
  expectTypeOf<
    Parameters<McpTypedMiddlewareFn<"tools/call">>[0]["params"]["name"]
  >().toBeString();
  expectTypeOf<
    Parameters<McpTypedMiddlewareFn<"tools/call">>[1]
  >().toEqualTypeOf<McpExtra>();
  expectTypeOf<
    Parameters<McpTypedMiddlewareFn<"notifications/initialized">>[1]
  >().toEqualTypeOf<undefined>();
});

test("catch-all middleware has no narrowing on extra or params", () => {
  server.mcpMiddleware((_request, extra, next) => {
    expectTypeOf(extra).toEqualTypeOf<McpExtra | undefined>();
    expectTypeOf(_request.params).toEqualTypeOf<Record<string, unknown>>();
    return next();
  });
});

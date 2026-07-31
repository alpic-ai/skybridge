import { expectTypeOf, test } from "vitest";
import { z } from "zod";
import type { McpServer } from "./server.js";

type Claims = { subject?: string; orgId: string };

const server = null as unknown as McpServer;
const typed = server.withAuthExtra<Claims>();

test("default server keeps the SDK's untyped extra bag", () => {
  server.registerTool(
    { name: "plain", inputSchema: { q: z.string() } },
    (_args, extra) => {
      expectTypeOf(extra.authInfo?.extra).toEqualTypeOf<
        Record<string, unknown> | undefined
      >();
      return { content: "ok" };
    },
  );
});

test("withAuthExtra types extra.authInfo.extra in tool handlers", () => {
  typed.registerTool(
    { name: "claims", inputSchema: { q: z.string() } },
    (_args, extra) => {
      expectTypeOf(extra.authInfo?.extra?.orgId).toEqualTypeOf<
        string | undefined
      >();
      expectTypeOf(extra.authInfo?.extra?.subject).toEqualTypeOf<
        string | undefined
      >();
      // @ts-expect-error unknown claim
      extra.authInfo?.extra?.nope;
      return { content: "ok" };
    },
  );
});

test("the declared extra survives registerTool chaining", () => {
  typed
    .registerTool({ name: "a", inputSchema: {} }, () => ({ content: "a" }))
    .registerTool({ name: "b", inputSchema: {} }, (_args, extra) => {
      expectTypeOf(extra.authInfo?.extra?.orgId).toEqualTypeOf<
        string | undefined
      >();
      return { content: "b" };
    });
});

test("withAuthExtra types extra.authInfo.extra in mcp middleware", () => {
  typed.mcpMiddleware("tools/call", (_request, extra, next) => {
    expectTypeOf(extra.authInfo?.extra?.orgId).toEqualTypeOf<
      string | undefined
    >();
    return next();
  });
});

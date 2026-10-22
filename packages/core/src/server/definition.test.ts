import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import type { Server } from "@modelcontextprotocol/server";
import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { Skybridge } from "./app.js";
import { defineServer } from "./definition.js";
import type { ToolInput, ToolNames } from "./inferUtilityTypes.js";

async function connect(execution: { createServerInstance(): Promise<Server> }) {
  const server = await execution.createServerInstance();
  const client = new Client({ name: "test", version: "1" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return client;
}

describe("server definitions", () => {
  it("composes immutable outer middleware on fresh instances with preserved tool types", async () => {
    const events: string[] = [];
    const service = defineServer({
      handler: (server) =>
        server
          .registerTool(
            { name: "echo", inputSchema: { message: z.string() } },
            ({ message }) => {
              events.push("handler");
              return { content: message };
            },
          )
          .mcpMiddleware("tools/call", async (_request, _extra, next) => {
            events.push("application:before");
            const result = await next();
            events.push("application:after");
            return result;
          }),
    });
    const first = service.mcpMiddleware(
      "tools/call",
      async (_request, _extra, next) => {
        events.push("first:before");
        const result = await next();
        events.push("first:after");
        return result;
      },
    );
    const second = first.mcpMiddleware(
      "tools/call",
      async (_request, _extra, next) => {
        events.push("second:before");
        const result = await next();
        events.push("second:after");
        return result;
      },
    );
    expectTypeOf<ToolNames<typeof second>>().toEqualTypeOf<"echo">();
    expectTypeOf<ToolInput<typeof second, "echo">>().toEqualTypeOf<{
      message: string;
    }>();
    for (const [definition, expected] of [
      [
        second,
        [
          "second:before",
          "first:before",
          "application:before",
          "handler",
          "application:after",
          "first:after",
          "second:after",
        ],
      ],
      [
        first,
        [
          "first:before",
          "application:before",
          "handler",
          "application:after",
          "first:after",
        ],
      ],
      [service, ["application:before", "handler", "application:after"]],
    ] as const) {
      const execution = definition.createExecution();
      const clients = await Promise.all([
        connect(execution),
        connect(execution),
      ]);
      try {
        for (const client of clients) {
          events.length = 0;
          expect(
            await client.callTool({
              name: "echo",
              arguments: { message: "hello" },
            }),
          ).toMatchObject({ content: [{ type: "text", text: "hello" }] });
          expect(events).toEqual(expected);
        }
      } finally {
        await execution.close();
      }
    }
  });

  it("shares setup within an execution and isolates execution and HTTP host state", async () => {
    let loads = 0;
    const disposed: number[] = [];
    const service = defineServer({
      setup: async () => ({ id: ++loads, calls: 0 }),
      dispose: ({ id }) => {
        disposed.push(id);
      },
      handler: (server, state) =>
        server.registerTool({ name: "count", inputSchema: {} }, () => ({
          content: `${state.id}:${++state.calls}`,
        })),
    });
    const first = service.createExecution();
    const second = service.createExecution();
    const host = new Skybridge({ server: service });
    expect(loads).toBe(0);
    const [a, b, c, production] = await Promise.all([
      connect(first),
      connect(first),
      connect(second),
      connect(host),
    ]);
    try {
      expect(loads).toBe(3);
      const text = async (client: Client) =>
        (await client.callTool({ name: "count" })).content;
      expect(await text(a)).toEqual([{ type: "text", text: "1:1" }]);
      expect(await text(b)).toEqual([{ type: "text", text: "1:2" }]);
      expect(await text(c)).toEqual([{ type: "text", text: "2:1" }]);
      expect(await text(production)).toEqual([{ type: "text", text: "3:1" }]);
      await Promise.all([first.close(), first.close()]);
      expect(disposed).toEqual([1]);
      await expect(first.createServerInstance()).rejects.toThrow("closed");
      expect(await text(c)).toEqual([{ type: "text", text: "2:2" }]);
    } finally {
      await Promise.all([first.close(), second.close(), host.close()]);
    }
    expect(disposed).toEqual([1, 2, 3]);
  });

  it("validates inputs and runs middleware before a terminal replacement", async () => {
    const seen: string[] = [];
    const service = defineServer({
      handler: (server) =>
        server
          .registerTool(
            { name: "echo", inputSchema: { message: z.string().trim() } },
            ({ message }) => {
              seen.push("original");
              return { content: message };
            },
          )
          .mcpMiddleware("tools/call", async (_request, _extra, next) => {
            seen.push("before");
            const result = await next();
            seen.push("after");
            return result;
          }),
    });
    const execution = service.createExecution({
      toolImplementations: {
        echo: ({ message }) => {
          expectTypeOf(message).toEqualTypeOf<string>();
          seen.push(message);
          return { content: [{ type: "text", text: "stubbed" }] };
        },
      },
    });
    const client = await connect(execution);
    try {
      expect(
        await client.callTool({
          name: "echo",
          arguments: { message: " valid " },
        }),
      ).toMatchObject({ content: [{ type: "text", text: "stubbed" }] });
      expect(seen).toEqual(["before", "valid", "after"]);
      seen.length = 0;
      expect(
        await client.callTool({ name: "echo", arguments: { message: 42 } }),
      ).toMatchObject({ isError: true });
      expect(seen).toEqual(["before", "after"]);
    } finally {
      await execution.close();
    }
  });

  it("disposes setup when host initialization fails and permits a fresh attempt", async () => {
    let loads = 0;
    const disposed: number[] = [];
    const host = new Skybridge({
      server: defineServer({
        setup: () => ++loads,
        dispose: (id) => {
          disposed.push(id);
        },
        handler: (server, id) => {
          if (id === 1) {
            throw new Error("registration failed");
          }
          return server;
        },
      }),
    });
    await expect(host.createServerInstance()).rejects.toThrow(
      "registration failed",
    );
    expect(disposed).toEqual([1]);
    await host.createServerInstance();
    await host.close();
    await host.close();
    expect(disposed).toEqual([1, 2]);
  });
});

import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Skybridge } from "./app.js";

const oauthConfig = {
  oauthMetadata: {
    issuer: "https://issuer.example.com",
    authorization_endpoint: "https://issuer.example.com/authorize",
    token_endpoint: "https://issuer.example.com/token",
    response_types_supported: ["code"],
  },
  verifier: {
    verifyAccessToken: async () => ({
      token: "t",
      clientId: "c",
      scopes: [],
      extra: {},
    }),
  },
};

describe("Skybridge setup and handler", () => {
  it("configures fresh instances before composing their native middleware", async () => {
    const events: string[] = [];
    let configured = 0;
    let loaded = 0;
    const app = new Skybridge({
      name: "instance-hook",
      version: "1",
      setup: () => {
        loaded += 1;
        return "ready";
      },
      handler: (server, config) =>
        server
          .registerTool(
            {
              name: "echo",
              inputSchema: { message: z.string() },
              description: config,
            },
            async ({ message }) => {
              events.push("handler");
              return { content: message };
            },
          )
          .mcpMiddleware("tools/call", async (_request, _extra, next) => {
            events.push("app:before");
            const result = await next();
            events.push("app:after");
            return result;
          }),
    });
    const configure: NonNullable<
      Parameters<typeof app.createServerInstance>[0]
    > = (server) => {
      configured += 1;
      server.mcpMiddleware("tools/list", async (_request, _extra, next) => {
        const result = await next();
        return {
          ...result,
          tools: result.tools.map((tool) => ({
            ...tool,
            description: "configured",
          })),
        };
      });
      server.mcpMiddleware("tools/call", async (request, _extra, next) => {
        events.push("hook:before");
        request.params.arguments = { message: "configured" };
        const result = await next();
        events.push("hook:after");
        return result;
      });
    };
    const instances = await Promise.all([
      app.createServerInstance(configure),
      app.createServerInstance(configure),
      app.createServerInstance(),
    ]);
    for (const [index, instance] of instances.entries()) {
      const client = new Client({ name: "client", version: "1" });
      const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();
      await instance.connect(serverTransport);
      await client.connect(clientTransport);
      try {
        const expected = index < 2 ? "configured" : "ready";
        expect((await client.listTools()).tools[0]?.description).toBe(expected);
        events.length = 0;
        expect(
          await client.callTool({
            name: "echo",
            arguments: { message: "original" },
          }),
        ).toMatchObject({
          content: [
            { type: "text", text: index < 2 ? "configured" : "original" },
          ],
        });
        expect(events).toEqual(
          index < 2
            ? [
                "app:before",
                "hook:before",
                "handler",
                "hook:after",
                "app:after",
              ]
            : ["app:before", "handler", "app:after"],
        );
      } finally {
        await client.close();
      }
    }
    expect(configured).toBe(2);
    expect(loaded).toBe(1);
  });

  it("propagates a failed instance hook without changing later instances", async () => {
    const app = new Skybridge({
      name: "instance-hook",
      version: "1",
      handler: (server) => server,
    });
    await expect(
      app.createServerInstance(() => {
        throw new Error("configure failed");
      }),
    ).rejects.toThrow("configure failed");
    const instance = await app.createServerInstance();
    await instance.close();
  });

  it("resolves setup once and passes the context to the per-request handler", async () => {
    let loads = 0;
    const app = new Skybridge({
      name: "test",
      version: "1.0.0",
      setup: async () => {
        loads++;
        return { greeting: await Promise.resolve("hello") };
      },
      handler: (server, { greeting }) =>
        server.registerTool(
          { name: "greet", description: "greet" },
          async () => ({ content: [{ type: "text", text: greeting }] }),
        ),
    });

    expect(loads).toBe(0);

    const call = async () => {
      const client = new Client({ name: "client", version: "1.0.0" });
      const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();
      await app.connect(serverTransport);
      await client.connect(clientTransport);
      const result = await client.callTool({ name: "greet" });
      await client.close();
      return result;
    };

    expect(await call()).toMatchObject({
      content: [{ type: "text", text: "hello" }],
    });
    expect(await call()).toMatchObject({
      content: [{ type: "text", text: "hello" }],
    });
    expect(loads).toBe(1);
  });

  it("retries setup after a failed first resolution", async () => {
    let attempts = 0;
    const app = new Skybridge({
      name: "test",
      version: "1.0.0",
      setup: async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error("transient");
        }
      },
      handler: (server) => server,
    });

    const [, first] = InMemoryTransport.createLinkedPair();
    await expect(app.connect(first)).rejects.toThrow("transient");

    const [, second] = InMemoryTransport.createLinkedPair();
    await expect(app.connect(second)).resolves.toBeUndefined();
    expect(attempts).toBe(2);
  });

  it("rejects a handler that returns a promise", async () => {
    const app = new Skybridge({
      name: "test",
      version: "1.0.0",
      // @ts-expect-error the handler runs per request and must stay synchronous
      handler: async (server) => server,
    });
    const [, serverTransport] = InMemoryTransport.createLinkedPair();
    await expect(app.connect(serverTransport)).rejects.toThrow(
      /must be synchronous/,
    );
  });

  it("resolves an oauth function with the setup config before wiring the routes", async () => {
    let seen: unknown;
    const app = new Skybridge({
      name: "test",
      version: "1.0.0",
      setup: () => ({ issuer: "https://issuer.example.com" }),
      oauth: (config) => {
        seen = config;
        return oauthConfig;
      },
      handler: (server) => server,
    });

    expect(seen).toBeUndefined();
    const [, serverTransport] = InMemoryTransport.createLinkedPair();
    await app.connect(serverTransport);
    expect(seen).toEqual({ issuer: "https://issuer.example.com" });
  });
});

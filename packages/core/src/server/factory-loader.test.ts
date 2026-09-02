import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";
import { Skybridge } from "./app.js";
import type { McpServer } from "./server.js";

describe("async factory loader", () => {
  it("resolves the loader once, then serves requests with the loaded factory", async () => {
    let loads = 0;
    const app = new Skybridge({ name: "test", version: "1.0.0" }, async () => {
      loads++;
      const greeting = await Promise.resolve("hello");
      return (server: McpServer) =>
        server.registerTool(
          { name: "greet", description: "greet" },
          async () => ({ content: [{ type: "text", text: greeting }] }),
        );
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

  it("retries the loader after a failed first resolution", async () => {
    let attempts = 0;
    const app = new Skybridge({ name: "test", version: "1.0.0" }, async () => {
      attempts++;
      if (attempts === 1) {
        throw new Error("transient");
      }
      return (server: McpServer) => server;
    });

    const [, first] = InMemoryTransport.createLinkedPair();
    await expect(app.connect(first)).rejects.toThrow("transient");

    const [, second] = InMemoryTransport.createLinkedPair();
    await expect(app.connect(second)).resolves.toBeUndefined();
    expect(attempts).toBe(2);
  });

  it("rejects a factory that returns a promise at construction", () => {
    expect(
      () =>
        new Skybridge(
          { name: "test", version: "1.0.0" },
          // @ts-expect-error an async factory is invalid: only the loader may be async
          async (server) => server,
        ),
    ).toThrow(/must be synchronous/);
  });

  it("resolves an oauth thunk before wiring the metadata routes", async () => {
    let resolved = false;
    const app = new Skybridge(
      {
        name: "test",
        version: "1.0.0",
        oauth: async () => {
          resolved = true;
          return {
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
        },
      },
      (server) => server,
    );

    expect(resolved).toBe(false);
    const [, serverTransport] = InMemoryTransport.createLinkedPair();
    await app.connect(serverTransport);
    expect(resolved).toBe(true);
  });
});

describe("config setup and handler", () => {
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

  it("resolves an oauth function with the setup context before wiring the routes", async () => {
    let seen: unknown;
    const app = new Skybridge({
      name: "test",
      version: "1.0.0",
      setup: () => ({ issuer: "https://issuer.example.com" }),
      oauth: (context) => {
        seen = context;
        return {
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
      },
      handler: (server) => server,
    });

    expect(seen).toBeUndefined();
    const [, serverTransport] = InMemoryTransport.createLinkedPair();
    await app.connect(serverTransport);
    expect(seen).toEqual({ issuer: "https://issuer.example.com" });
  });
});

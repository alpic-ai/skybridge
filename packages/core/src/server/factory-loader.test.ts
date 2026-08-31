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
    expect(() => app.createServerInstance()).toThrow(/async factory loader/);

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

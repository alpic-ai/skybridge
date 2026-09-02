import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";
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

  it("resolves an oauth function with the setup context before wiring the routes", async () => {
    let seen: unknown;
    const app = new Skybridge({
      name: "test",
      version: "1.0.0",
      setup: () => ({ issuer: "https://issuer.example.com" }),
      oauth: (context) => {
        seen = context;
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

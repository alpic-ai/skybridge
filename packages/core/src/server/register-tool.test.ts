import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Skybridge } from "./app.js";

describe("registerTool handler invocation", () => {
  it("passes empty args and a usable extra to a schema-less tool handler", async () => {
    let received: { args: unknown; extra: unknown } | undefined;
    const app = new Skybridge({
      name: "test",
      version: "1.0.0",
      handler: (server) =>
        server.registerTool(
          { name: "no-input", description: "no-input" },
          async (args, extra) => {
            received = { args, extra };
            return { content: [{ type: "text", text: "ok" }] };
          },
        ),
    });
    const instance = await app.createServerInstance();

    const client = new Client({ name: "client", version: "1.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await instance.connect(serverTransport);
    await client.connect(clientTransport);

    await client.callTool({ name: "no-input" });

    expect(received?.args).toEqual({});
    expect(received?.extra).toHaveProperty("mcpReq.send");

    await client.close();
    await instance.close();
  });

  it("emits openai options as openai/ui metadata on the tool and its view", async () => {
    const app = new Skybridge({
      name: "test",
      version: "1.0.0",
      handler: (server) =>
        server.registerTool(
          {
            name: "library",
            description: "library",
            view: { component: "widget" },
            openai: {
              entrypoints: [
                { type: "global" },
                { type: "file", extensions: [".stl"] },
              ],
              availableDisplayModes: ["inline", "fullscreen"],
              preferredDisplayMode: "fullscreen",
            },
          },
          async () => ({ content: "ok" }),
        ),
    });
    const instance = await app.createServerInstance();
    const client = new Client({ name: "client", version: "1.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await instance.connect(serverTransport);
    await client.connect(clientTransport);

    const { tools } = await client.listTools();
    const { resources } = await client.listResources();

    expect(tools[0]?._meta?.["openai/ui"]).toEqual({
      entrypoints: [{ type: "global" }, { type: "file", extensions: [".stl"] }],
    });
    expect(resources[0]?._meta?.["openai/ui"]).toEqual({
      availableDisplayModes: ["inline", "fullscreen"],
      preferredDisplayMode: "fullscreen",
    });

    await client.close();
    await instance.close();
  });

  it("rejects a global entrypoint on a tool that requires input", async () => {
    const app = new Skybridge({
      name: "test",
      version: "1.0.0",
      handler: (server) =>
        server.registerTool(
          {
            name: "search",
            description: "search",
            inputSchema: { query: z.string() },
            view: { component: "widget" },
            openai: { entrypoints: [{ type: "global" }] },
          },
          async () => ({ content: "ok" }),
        ),
    });

    await expect(app.createServerInstance()).rejects.toThrow(/rejects `\{\}`/);
  });

  it("registers mention search as an app-only tool advertising the extension", async () => {
    const app = new Skybridge({
      name: "test",
      version: "1.0.0",
      handler: (server) =>
        server.registerMentions({
          name: "search_parts",
          handler: async ({ query }) => ({
            items: [
              { type: "resource_link", uri: `parts://${query}`, name: query },
            ],
          }),
        }),
    });
    const instance = await app.createServerInstance();
    const client = new Client({ name: "client", version: "1.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await instance.connect(serverTransport);
    await client.connect(clientTransport);

    const { tools } = await client.listTools();
    expect(tools[0]?._meta).toMatchObject({
      "openai/extensions": { "mentions/search": {} },
      ui: { visibility: ["app"] },
    });
    const result = await client.callTool({
      name: "search_parts",
      arguments: { query: "bolt" },
    });
    expect(result.structuredContent).toEqual({
      items: [{ type: "resource_link", uri: "parts://bolt", name: "bolt" }],
    });

    await client.close();
    await instance.close();
  });
});

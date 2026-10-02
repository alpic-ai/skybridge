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

  it("registers settings tools and advertises the settings capability", async () => {
    let stored = { units: "mm" as "mm" | "in", zoom: 3 };
    const fields = {
      units: { title: "Units", schema: z.enum(["mm", "in"]) },
      zoom: { title: "Zoom", schema: z.number().int().min(1).max(10) },
    };
    const app = new Skybridge({
      name: "test",
      version: "1.0.0",
      handler: (server) =>
        server.registerSettings({
          fields,
          layout: [
            {
              kind: "group",
              title: "Display",
              items: [{ kind: "property", property: "units" }],
            },
          ],
          read: () => stored,
          update: (set) => {
            stored = { ...stored, ...set };
            return stored;
          },
        }),
    });
    const instance = await app.createServerInstance();
    const client = new Client({ name: "client", version: "1.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await instance.connect(serverTransport);
    await client.connect(clientTransport);

    const capability = {
      readTool: "settings-read",
      updateTool: "settings-update",
    };
    expect(client.getServerCapabilities()).toMatchObject({
      extensions: { "openai/settings": capability },
      experimental: { "openai/settings": capability },
    });
    const read = await client.callTool({
      name: "settings-read",
      arguments: {},
    });
    expect(read.structuredContent).toMatchObject({
      schema: {
        type: "object",
        properties: {
          units: { type: "string", enum: ["mm", "in"], title: "Units" },
          zoom: { type: "integer", minimum: 1, maximum: 10, title: "Zoom" },
        },
        required: ["units", "zoom"],
      },
      values: { units: "mm", zoom: 3 },
      layout: [{ kind: "group", title: "Display" }],
    });
    const updated = await client.callTool({
      name: "settings-update",
      arguments: { set: { units: "in" } },
    });
    expect(updated.structuredContent).toEqual({
      values: { units: "in", zoom: 3 },
    });
    const empty = await client.callTool({
      name: "settings-update",
      arguments: { set: {} },
    });
    expect(empty.isError).toBe(true);

    await client.close();
    await instance.close();

    const withDefault = new Skybridge({
      name: "test",
      version: "1.0.0",
      handler: (server) =>
        server.registerSettings({
          fields: {
            grid: { title: "Grid", schema: z.boolean().default(true) },
          },
          read: () => ({ grid: true }),
          update: () => ({ grid: true }),
        }),
    });
    await expect(withDefault.createServerInstance()).rejects.toThrow(
      /declares a default/,
    );
  });

  it("registers a file viewer with the file input and a file entrypoint", async () => {
    const app = new Skybridge({
      name: "test",
      version: "1.0.0",
      handler: (server) =>
        server.registerFileViewer(
          {
            name: "part-viewer",
            extensions: [".stl"],
            view: { component: "widget" },
          },
          async ({ file }) => ({ content: file.name }),
        ),
    });
    const instance = await app.createServerInstance();
    const client = new Client({ name: "client", version: "1.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await instance.connect(serverTransport);
    await client.connect(clientTransport);

    const { tools } = await client.listTools();
    expect(tools[0]?._meta?.["openai/ui"]).toEqual({
      entrypoints: [{ type: "file", extensions: [".stl"] }],
    });
    expect(tools[0]?.inputSchema.required).toEqual(["file"]);

    await client.close();
    await instance.close();
  });
});

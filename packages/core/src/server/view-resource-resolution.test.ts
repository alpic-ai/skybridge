import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { McpServer } from "./index.js";

// Mirror what the Skybridge Vite plugin generates in `.skybridge/views.d.ts`:
// narrow `ViewName` so `component: "widget"` typechecks against the registry.
declare module "./server.js" {
  interface ViewNameRegistry {
    widget: true;
  }
}

// - a view resource must resolve no matter the `?v=` query param value.
// The version param is a content-derived cache key for external consumers
// (it busts host/CDN caches when the bundle changes); it is not part of the
// resource's identity, so a stale, absent, or arbitrary param must still serve
// the underlying asset.

async function connect(register: (server: McpServer) => void) {
  const server = new McpServer({ name: "test", version: "1.0.0" });
  register(server);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return {
    client,
    teardown: async () => {
      await client.close();
      await server.close();
    },
  };
}

function registerWidget(server: McpServer) {
  server.registerTool(
    { name: "show", description: "show", view: { component: "widget" } },
    () => ({ content: [{ type: "text" as const, text: "ok" }] }),
  );
}

/** Narrow a read-resource content entry to its text variant. */
function textContent(contents: Array<{ uri: string }>): {
  uri: string;
  text: string;
} {
  return contents[0] as { uri: string; text: string };
}

describe("view resource resolution (cache key)", () => {
  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  it("resolves regardless of the ?v= param and echoes the requested URI", async () => {
    const { client, teardown } = await connect(registerWidget);

    const { resources } = await client.listResources();
    const listed = resources.find((r) =>
      r.uri.startsWith("ui://views/apps-sdk/widget.html"),
    );
    // Dev build advertises no cache key.
    expect(listed?.uri).toBe("ui://views/apps-sdk/widget.html");

    // A stale/arbitrary/absent param all resolve the same underlying asset,
    // and the response echoes the URI the consumer asked for (never rewritten).
    for (const uri of [
      "ui://views/apps-sdk/widget.html?v=stale123",
      "ui://views/apps-sdk/widget.html?v=whatever-else",
      "ui://views/apps-sdk/widget.html",
    ]) {
      const { contents } = await client.readResource({ uri });
      expect(contents).toHaveLength(1);
      const content = textContent(contents);
      expect(typeof content.text).toBe("string");
      expect(content.text.length).toBeGreaterThan(0);
      expect(content.uri).toBe(uri);
    }

    await teardown();
  });

  it("resolves a stale cache key when the canonical URI carries ?v= (prod)", async () => {
    process.env.NODE_ENV = "production";

    const { client, teardown } = await connect((server) => {
      server.setViteManifest({
        "src/views/widget.tsx": {
          isEntry: true,
          name: "widget",
          file: "assets/widget-ABC123.js",
        },
        "style.css": { file: "assets/style-XYZ.css" },
      } as unknown as Record<string, { file: string }>);
      registerWidget(server);
    });

    const { resources } = await client.listResources();
    const listed = resources.find((r) =>
      r.uri.startsWith("ui://views/apps-sdk/widget.html"),
    );
    // Production advertises a content-derived cache key.
    expect(listed?.uri).toMatch(
      /^ui:\/\/views\/apps-sdk\/widget\.html\?v=[0-9a-f]{8}$/,
    );

    // A consumer holding a stale key still resolves the current asset.
    const staleUri = "ui://views/apps-sdk/widget.html?v=00000000";
    const { contents } = await client.readResource({ uri: staleUri });
    expect(contents).toHaveLength(1);
    const content = textContent(contents);
    expect(typeof content.text).toBe("string");
    expect(content.uri).toBe(staleUri);

    await teardown();
  });

  it("still throws for an unknown view path", async () => {
    const { client, teardown } = await connect(registerWidget);

    await expect(
      client.readResource({ uri: "ui://views/apps-sdk/nope.html?v=1" }),
    ).rejects.toThrow();

    await teardown();
  });
});

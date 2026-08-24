import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { McpServer } from "./server.js";

describe("registerTool handler invocation", () => {
  it("passes empty args and a usable extra to a schema-less tool handler", async () => {
    let received: { args: unknown; extra: unknown } | undefined;
    const server = new McpServer({
      name: "test",
      version: "1.0.0",
    }).registerTool(
      { name: "no-input", description: "no-input" },
      async (args, extra) => {
        received = { args, extra };
        return { content: [{ type: "text", text: "ok" }] };
      },
    );

    const client = new Client({ name: "client", version: "1.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    await client.callTool({ name: "no-input" });

    expect(received?.args).toEqual({});
    expect(received?.extra).toHaveProperty("sendRequest");

    await client.close();
    await server.close();
  });
});

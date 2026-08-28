import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";
import { Skybridge } from "./app.js";

describe("registerTool handler invocation", () => {
  it("passes empty args and a usable extra to a schema-less tool handler", async () => {
    let received: { args: unknown; extra: unknown } | undefined;
    const app = new Skybridge({ name: "test", version: "1.0.0" }, (server) =>
      server.registerTool(
        { name: "no-input", description: "no-input" },
        async (args, extra) => {
          received = { args, extra };
          return { content: [{ type: "text", text: "ok" }] };
        },
      ),
    );
    const instance = app.createServerInstance();

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
});

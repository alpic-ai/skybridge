import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { McpServer } from "./index.js";

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

describe("registerResource / registerPrompt config-object API", () => {
  it("registers and reads a resource, chaining with registerPrompt", async () => {
    const { client, teardown } = await connect((server) => {
      const chained = server
        .registerResource(
          { name: "pricing", uri: "docs://pricing", mimeType: "text/markdown" },
          async (uri) => ({ contents: [{ uri: uri.href, text: "$5" }] }),
        )
        .registerPrompt(
          { name: "trip", argsSchema: { destination: z.string() } },
          ({ destination }) => ({
            messages: [
              {
                role: "user",
                content: { type: "text", text: `Trip to ${destination}` },
              },
            ],
          }),
        );
      expect(chained).toBe(server);
    });

    const { contents } = await client.readResource({ uri: "docs://pricing" });
    expect((contents[0] as { text: string }).text).toBe("$5");

    const prompt = await client.getPrompt({
      name: "trip",
      arguments: { destination: "Rome" },
    });
    expect((prompt.messages[0]?.content as { text: string }).text).toBe(
      "Trip to Rome",
    );

    await teardown();
  });

  it("rejects resources colliding with the reserved ui://views/ namespace", () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    expect(() =>
      server.registerResource(
        { name: "sneaky", uri: "ui://views/ext-apps/x.html" },
        async (uri) => ({ contents: [{ uri: uri.href, text: "" }] }),
      ),
    ).toThrow(/reserved/);
  });
});

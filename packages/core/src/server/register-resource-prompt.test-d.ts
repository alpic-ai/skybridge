import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { expectTypeOf, test } from "vitest";
import { z } from "zod";
import type { McpServer } from "./server.js";

const server = null as unknown as McpServer;

test("registerResource config object is chainable", () => {
  expectTypeOf(
    server.registerResource(
      { name: "pricing", uri: "docs://pricing", mimeType: "text/markdown" },
      async (uri) => ({ contents: [{ uri: uri.href, text: "" }] }),
    ),
  ).toEqualTypeOf<typeof server>();
});

test("registerResource template variant passes variables to the callback", () => {
  server.registerResource(
    {
      name: "doc",
      template: new ResourceTemplate("docs://{id}", { list: undefined }),
    },
    async (uri, variables) => {
      expectTypeOf(variables).toBeObject();
      return { contents: [{ uri: uri.href, text: "" }] };
    },
  );
});

test("registerPrompt config object is chainable and typed args", () => {
  expectTypeOf(
    server.registerPrompt(
      { name: "trip-summary", argsSchema: { destination: z.string() } },
      ({ destination }) => {
        expectTypeOf(destination).toEqualTypeOf<string>();
        return { messages: [] };
      },
    ),
  ).toEqualTypeOf<typeof server>();
});

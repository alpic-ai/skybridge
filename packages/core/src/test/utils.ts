import { McpServer as McpServerBase } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type MockInstance, vi } from "vitest";
import * as z from "zod";
import { McpServer } from "../server/server.js";

export function createMockMcpServer(): {
  server: McpServer;
  mockRegisterResource: MockInstance<McpServer["registerResource"]>;
  mockRegisterTool: MockInstance;
} {
  const server = new McpServer(
    {
      name: "alpic-openai-app",
      version: "0.0.1",
    },
    { capabilities: {} },
  );

  const mockRegisterResource = vi.spyOn(server, "registerResource");
  const mockRegisterTool = vi.spyOn(McpServerBase.prototype, "registerTool");

  return {
    server,
    mockRegisterResource,
    mockRegisterTool,
  };
}

export function createTestServer() {
  return new McpServer({ name: "test-app", version: "1.0.0" }, {})
    .registerTool(
      {
        name: "search-voyage",
        description: "Search for voyages",
        inputSchema: {
          destination: z.string(),
          departureDate: z.string().optional(),
          maxPrice: z.number().optional(),
        },
        outputSchema: {
          results: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              price: z.number(),
            }),
          ),
          totalCount: z.number(),
        },
        view: { component: "search-voyage" },
      },
      async ({ destination }) => {
        return {
          content: [{ type: "text", text: `Found trips to ${destination}` }],
          structuredContent: {
            results: [{ id: "1", name: "Trip", price: 1000 }],
            totalCount: 1,
          },
        };
      },
    )
    .registerTool(
      {
        name: "get-trip-details",
        description: "Get trip details",
        inputSchema: {
          tripId: z.string(),
        },
        outputSchema: {
          name: z.string(),
          description: z.string(),
          images: z.array(z.string()),
        },
        view: { component: "get-trip-details" },
      },
      async ({ tripId }) => {
        return {
          content: [{ type: "text", text: `Details for ${tripId}` }],
          structuredContent: {
            name: "Trip",
            description: "A great trip",
            images: ["image1.jpg"],
          },
        };
      },
    )
    .registerTool(
      {
        name: "no-input-widget",
        description: "Widget with no input",
        inputSchema: {},
        outputSchema: {},
        view: { component: "no-input-widget" },
      },
      async () => {
        return {
          content: [{ type: "text", text: "No input needed" }],
          structuredContent: {},
        };
      },
    )
    .registerTool(
      {
        name: "inferred-output-widget",
        description: "Widget with output inferred from callback",
        inputSchema: {
          query: z.string(),
        },
        view: { component: "inferred-output-widget" },
      },
      async ({ query }) => {
        return {
          content: [{ type: "text", text: `Query: ${query}` }],
          structuredContent: {
            inferredResults: [{ id: "inferred-1", score: 0.95 }],
            inferredCount: 1,
          },
        };
      },
    )
    .registerTool(
      {
        name: "calculate-price",
        description: "Calculate trip price",
        inputSchema: {
          tripId: z.string(),
          passengers: z.number(),
        },
        outputSchema: {
          totalPrice: z.number(),
          currency: z.string(),
        },
      },
      async ({ tripId, passengers }) => {
        return {
          content: [{ type: "text", text: `Price for ${tripId}` }],
          structuredContent: {
            totalPrice: 1000 * passengers,
            currency: "USD",
          },
        };
      },
    )
    .registerTool(
      {
        name: "inferred-tool",
        description: "Tool with output inferred from callback",
        inputSchema: {
          itemId: z.string(),
        },
      },
      async ({ itemId }) => {
        return {
          content: [{ type: "text", text: `Item: ${itemId}` }],
          structuredContent: {
            itemDetails: { name: "Inferred Item", available: true },
            fetchedAt: "2024-01-01",
          },
        };
      },
    )
    .registerTool(
      {
        name: "widget-with-metadata",
        description: "Widget that returns response metadata",
        inputSchema: {
          resourceId: z.string(),
        },
        view: { component: "widget-with-metadata" },
      },
      async ({ resourceId }) => {
        return {
          content: [{ type: "text", text: `Resource: ${resourceId}` }],
          structuredContent: {
            data: { id: resourceId, loaded: true },
          },
          _meta: {
            requestId: "req-123",
            timestamp: 1704067200000,
            cached: false,
          },
        };
      },
    )
    .registerTool(
      {
        name: "tool-with-metadata",
        description: "Tool that returns response metadata",
        inputSchema: {
          query: z.string(),
        },
      },
      async ({ query }) => {
        return {
          content: [{ type: "text", text: `Query: ${query}` }],
          structuredContent: {
            results: [query],
          },
          _meta: {
            executionTime: 150,
            source: "cache",
          },
        };
      },
    )
    .registerTool(
      {
        name: "widget-with-mixed-returns",
        description:
          "Widget with mixed return paths (some with _meta, some without)",
        inputSchema: {
          shouldSucceed: z.boolean(),
        },
        view: { component: "widget-with-mixed-returns" },
      },
      async ({ shouldSucceed }) => {
        if (!shouldSucceed) {
          return {
            content: [{ type: "text", text: "Error occurred" }],
            structuredContent: { error: "Something went wrong" },
          };
        }
        return {
          content: [{ type: "text", text: "Success" }],
          structuredContent: { data: "result" },
          _meta: {
            processedAt: 1704067200000,
            region: "eu-west-1",
          },
        };
      },
    );
}

export function createMinimalTestServer() {
  return new McpServer({ name: "test-app", version: "1.0.0" }, {}).registerTool(
    {
      name: "search-voyage",
      description: "Search for voyages",
      inputSchema: {
        destination: z.string(),
      },
      outputSchema: {
        results: z.array(z.object({ id: z.string() })),
      },
      view: { component: "search-voyage" },
    },
    async ({ destination }) => {
      return {
        content: [{ type: "text", text: `Found trips to ${destination}` }],
        structuredContent: { results: [{ id: "1" }] },
      };
    },
  );
}

interface InterfaceOutput {
  itemName: string;
  quantity: number;
}

interface InterfaceMeta {
  processedBy: string;
  version: number;
}

interface InterfaceReturnType {
  content: [{ type: "text"; text: string }];
  structuredContent: InterfaceOutput;
  _meta: InterfaceMeta;
}

export function createInterfaceTestServer() {
  return new McpServer(
    { name: "interface-test-app", version: "1.0.0" },
    {},
  ).registerTool(
    {
      name: "interface-widget" as const,
      description: "Widget with interface-typed output",
      inputSchema: {
        id: z.string(),
      },
      view: { component: "interface-widget" },
    },
    async ({ id }): Promise<InterfaceReturnType> => {
      return {
        content: [{ type: "text", text: `Item ${id}` }],
        structuredContent: {
          itemName: "Test Item",
          quantity: 42,
        },
        _meta: {
          processedBy: "test",
          version: 1,
        },
      };
    },
  );
}

export function createMockExtra(
  host: string,
  options?: {
    headers?: Record<string, string | string[]>;
    url?: URL | string;
  },
) {
  return {
    requestInfo: {
      headers: { host, ...(options?.headers ?? {}) },
      ...(options?.url ? { url: options.url } : {}),
    },
  };
}

export function setTestEnv(env: Record<string, string>) {
  Object.assign(process.env, env);
}

export function resetTestEnv() {
  delete process.env.NODE_ENV;
}

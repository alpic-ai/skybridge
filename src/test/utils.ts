import { type MockInstance, vi } from "vitest";
import * as z from "zod";
import { McpServer } from "../server/server.js";

/**
 * Creates a real McpServer instance for testing
 */
export function createMockMcpServer(): {
  server: McpServer;
  mockRegisterResource: MockInstance<McpServer["registerResource"]>;
  mockRegisterTool: MockInstance<McpServer["registerTool"]>;
} {
  // Create a real McpServer instance
  const server = new McpServer(
    {
      name: "alpic-openai-app",
      version: "0.0.1",
    },
    { capabilities: {} },
  );

  // Mock the underlying methods to track calls
  const mockRegisterResource = vi.spyOn(server, "registerResource");
  const mockRegisterTool = vi.spyOn(server, "registerTool");

  return {
    server,
    mockRegisterResource,
    mockRegisterTool,
  };
}

export function createTestServer() {
  return new McpServer({ name: "test-app", version: "1.0.0" }, {})
    .registerWidget(
      "search-voyage",
      {},
      {
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
    .registerWidget(
      "get-trip-details",
      {},
      {
        description: "Get trip details",
        inputSchema: {
          tripId: z.string(),
        },
        outputSchema: {
          name: z.string(),
          description: z.string(),
          images: z.array(z.string()),
        },
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
    .registerWidget(
      "no-input-widget",
      {},
      {
        description: "Widget with no input",
        inputSchema: {},
        outputSchema: {},
      },
      async () => {
        return {
          content: [{ type: "text", text: "No input needed" }],
          structuredContent: {},
        };
      },
    )
    .registerWidget(
      "inferred-output-widget",
      {},
      {
        description: "Widget with output inferred from callback",
        inputSchema: {
          query: z.string(),
        },
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
      "calculate-price",
      {
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
      "inferred-tool",
      {
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
    .registerWidget(
      "widget-with-metadata",
      {},
      {
        description: "Widget that returns response metadata",
        inputSchema: {
          resourceId: z.string(),
        },
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
      "tool-with-metadata",
      {
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
    .registerWidget(
      "widget-with-mixed-returns",
      {},
      {
        description:
          "Widget with mixed return paths (some with _meta, some without)",
        inputSchema: {
          shouldSucceed: z.boolean(),
        },
      },
      async ({ shouldSucceed }) => {
        if (!shouldSucceed) {
          // Error path - no _meta
          return {
            content: [{ type: "text", text: "Error occurred" }],
            structuredContent: { error: "Something went wrong" },
          };
        }
        // Success path - has _meta
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
  return new McpServer(
    { name: "test-app", version: "1.0.0" },
    {},
  ).registerWidget(
    "search-voyage",
    {},
    {
      description: "Search for voyages",
      inputSchema: {
        destination: z.string(),
      },
      outputSchema: {
        results: z.array(z.object({ id: z.string() })),
      },
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
  ).registerWidget<
    "interface-widget",
    { id: z.ZodString },
    InterfaceReturnType
  >(
    "interface-widget",
    {},
    {
      description: "Widget with interface-typed output",
      inputSchema: {
        id: z.string(),
      },
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

/**
 * Mock extra parameter for resource callback
 */
export function createMockExtra(host: string) {
  return {
    requestInfo: {
      headers: { host },
    },
  };
}

/**
 * Sets up environment variables for testing
 */
export function setTestEnv(env: Record<string, string>) {
  Object.assign(process.env, env);
}

/**
 * Resets environment variables
 */
export function resetTestEnv() {
  delete process.env.NODE_ENV;
}

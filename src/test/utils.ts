import { vi, type MockInstance } from "vitest";
import { McpServer } from "../server/server.js";
import { z } from "zod";

/**
 * Creates a real McpServer instance for testing
 */
export function createMockMcpServer(): {
  server: McpServer;
  mockResource: MockInstance<McpServer["resource"]>;
  mockRegisterTool: MockInstance<McpServer["registerTool"]>;
} {
  // Create a real McpServer instance
  const server = new McpServer(
    {
      name: "alpic-openai-app",
      version: "0.0.1",
    },
    { capabilities: {} }
  );

  // Mock the underlying methods to track calls
  const mockResource = vi.spyOn(server, "resource");
  const mockRegisterTool = vi.spyOn(server, "registerTool");

  return {
    server,
    mockResource,
    mockRegisterTool,
  };
}

export function createTestServer() {
  return new McpServer(
    { name: "test-app", version: "1.0.0" },
    {}
  )
    .widget(
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
            })
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
      }
    )
    .widget(
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
      }
    )
    .widget(
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
      }
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
      }
    );
}

export function createMinimalTestServer() {
  return new McpServer(
    { name: "test-app", version: "1.0.0" },
    {}
  ).widget(
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
    }
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

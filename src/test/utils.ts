import { vi, type MockInstance } from "vitest";
import { McpServer } from "../server/server.js";

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

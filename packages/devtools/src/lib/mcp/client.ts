import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { CallToolArgs, CallToolResponse } from "skybridge/web";

export class McpClient {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;

  async connect(serverUrl: string | URL): Promise<void> {
    const url = typeof serverUrl === "string" ? new URL(serverUrl) : serverUrl;

    this.transport = new StreamableHTTPClientTransport(url);

    this.client = new Client(
      {
        name: "mcp-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          experimental: {
            tools: {},
            resources: {},
            prompts: {},
          },
        },
      },
    );

    await this.client.connect(this.transport);
  }

  async listTools() {
    if (!this.client) {
      throw new Error("Client not connected. Call connect() first.");
    }

    try {
      const response = await this.client.listTools();
      return response.tools;
    } catch (error) {
      // A server without any tool throws a "Method not found" error for listTools
      if (
        error instanceof Error &&
        error.name === "McpError" &&
        error.message.includes("MCP error -32601: Method not found")
      ) {
        return [];
      }

      throw error;
    }
  }

  async callTool(
    toolName: string,
    args: CallToolArgs,
  ): Promise<CallToolResponse> {
    if (!this.client) {
      throw new Error("Client not connected. Call connect() first.");
    }

    const result = await this.client.callTool({
      name: toolName,
      arguments: args ?? {},
    });

    // Transform _meta → meta to match OpenAI's behavior
    const { _meta, ...rest } = result;
    return {
      ...rest,
      meta: _meta,
    } as CallToolResponse;
  }

  async listResources() {
    if (!this.client) {
      throw new Error("Client not connected. Call connect() first.");
    }

    const response = await this.client.listResources();
    return response.resources;
  }

  async readResource(uri: string) {
    if (!this.client) {
      throw new Error("Client not connected. Call connect() first.");
    }

    const response = await this.client.readResource({ uri });
    return response;
  }

  async listPrompts() {
    if (!this.client) {
      throw new Error("Client not connected. Call connect() first.");
    }

    const response = await this.client.listPrompts();
    return response.prompts;
  }

  async getPrompt(name: string, args?: Record<string, string>) {
    if (!this.client) {
      throw new Error("Client not connected. Call connect() first.");
    }

    const response = await this.client.getPrompt({
      name,
      ...(args && { arguments: args }),
    });
    return response;
  }

  getServerInfo() {
    if (!this.client) {
      throw new Error("Client not connected. Call connect() first.");
    }

    // biome-ignore lint/suspicious/noExplicitAny: We choose to rely on _serverVersion private property for now.
    return (this.client as any)._serverVersion as
      | { name: string; version: string }
      | undefined;
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.transport) {
      this.transport = null;
    }
  }
}

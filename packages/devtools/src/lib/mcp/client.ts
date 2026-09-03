import {
  Client,
  METHOD_NOT_FOUND,
  type OAuthClientProvider,
  ProtocolError,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import type { CallToolArgs, CallToolResponse } from "skybridge/web";

export class McpClient {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;

  async connect(
    serverUrl: string | URL,
    authProvider?: OAuthClientProvider,
  ): Promise<void> {
    const url = typeof serverUrl === "string" ? new URL(serverUrl) : serverUrl;

    this.transport = new StreamableHTTPClientTransport(url, {
      authProvider,
      // Forwarded headers let the MCP server recover its public origin in local
      // dev. The transport uses this fetch for cross-origin discovery and DCR
      // too, where they would trigger a CORS preflight the authorization server
      // has no reason to allow, so they are scoped to the server's own origin.
      fetch: (input, init) => {
        const target = input instanceof Request ? input.url : String(input);
        if (new URL(target).origin !== url.origin) {
          return fetch(input, init);
        }
        const headers = new Headers(init?.headers);
        headers.set("x-forwarded-host", url.host);
        headers.set("x-forwarded-proto", url.protocol.replace(/:$/, ""));
        return fetch(input, { ...init, headers });
      },
    });

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
      if (error instanceof ProtocolError && error.code === METHOD_NOT_FOUND) {
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

    return this.client.getServerVersion();
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    this.transport = null;
  }
}

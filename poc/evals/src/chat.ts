import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ToolInput, ToolNames } from "skybridge/server";
import { expect } from "vitest";

/**
 * One recorded call, typed against the project's own registry: `name` is a union
 * of the project's tool names and `arguments` is discriminated on it.
 */
export type ToolCall<App> = {
  [Name in ToolNames<App>]: { name: Name; arguments: ToolInput<App, Name> };
}[ToolNames<App>];

const MAX_TURNS = 8;

/**
 * An expected sequence, pinned to the project's registry, so a tool or an
 * argument that does not exist fails to typecheck. Arguments are partial:
 * `ToolInput` is the parsed input, so a zod `.default()` reads as required
 * even though the model never has to send it.
 */
export type ExpectedToolCalls<App> = {
  [Name in ToolNames<App>]: {
    name: Name;
    arguments: Partial<ToolInput<App, Name>>;
  };
}[ToolNames<App>][];

/**
 * Types the expectation, which `expect().toEqual()` does not do on its own, and
 * relaxes each arguments object so middleware-injected arguments do not break
 * the comparison.
 */
export function expectedCalls<App>(
  expected: ExpectedToolCalls<App>,
): unknown[] {
  return expected.map((call) => ({
    name: call.name,
    arguments: expect.objectContaining(call.arguments as object),
  }));
}

interface ModelConfig {
  baseURL: string;
  name: string;
  apiKeyEnv: string;
}

interface OpenAiToolCall {
  id: string;
  function: { name: string; arguments: string };
}

interface OpenAiMessage {
  role: "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
}

interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

function toOpenAiTool(tool: McpToolDefinition) {
  const { $schema: _ignored, ...parameters } = tool.inputSchema;
  return {
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description ?? "",
      parameters,
    },
  };
}

export class Chat<App> {
  /** Every call the model made, in order, as it crossed the wire. */
  readonly toolCalls: ToolCall<App>[] = [];

  private readonly messages: OpenAiMessage[] = [];
  private readonly client: Client;
  private readonly transport: StreamableHTTPClientTransport;
  private readonly model: ModelConfig;
  private tools: McpToolDefinition[] = [];

  private constructor(
    client: Client,
    transport: StreamableHTTPClientTransport,
    model: ModelConfig,
  ) {
    this.client = client;
    this.transport = transport;
    this.model = model;
  }

  static async open<App>(
    serverUrl: string,
    model: ModelConfig,
  ): Promise<Chat<App>> {
    const client = new Client({ name: "skybridge-eval", version: "0" });
    const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
    await client.connect(transport);
    const chat = new Chat<App>(client, transport, model);
    const { tools } = await client.listTools();
    chat.tools = tools as unknown as McpToolDefinition[];
    return chat;
  }

  /** The tool definitions the model was looking at, for failure reports. */
  get toolDefinitions(): McpToolDefinition[] {
    return this.tools;
  }

  async send(prompt: string): Promise<string> {
    this.messages.push({ role: "user", content: prompt });

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const reply = await this.complete();
      this.messages.push(reply);

      if (reply.tool_calls === undefined || reply.tool_calls.length === 0) {
        return reply.content ?? "";
      }

      for (const call of reply.tool_calls) {
        const args = JSON.parse(call.function.arguments || "{}");
        this.toolCalls.push({
          name: call.function.name,
          arguments: args,
        } as ToolCall<App>);

        const result = await this.client.callTool({
          name: call.function.name,
          arguments: args,
        });
        this.messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result.content ?? result),
        });
      }
    }

    throw new Error(
      `Model kept calling tools for ${MAX_TURNS} turns without answering`,
    );
  }

  async close(): Promise<void> {
    await this.transport.close();
  }

  private async complete(): Promise<OpenAiMessage> {
    const apiKey = process.env[this.model.apiKeyEnv];
    if (apiKey === undefined || apiKey === "") {
      throw new Error(`${this.model.apiKeyEnv} is not set`);
    }

    const response = await fetch(
      new URL("chat/completions", this.model.baseURL),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.model.name,
          temperature: 0,
          max_tokens: 1024,
          messages: this.messages,
          tools: this.tools.map(toOpenAiTool),
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `${this.model.name} returned ${response.status}: ${await response.text()}`,
      );
    }

    const body = (await response.json()) as {
      choices: [{ message: OpenAiMessage }];
    };
    return body.choices[0].message;
  }
}

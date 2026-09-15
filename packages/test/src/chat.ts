import {
  Client,
  StreamableHTTPClientTransport,
  type Tool,
} from "@modelcontextprotocol/client";
import type { ToolCall, TranscriptEntry } from "@skybridge/vite-plugin/evals";
import {
  dynamicTool,
  generateText,
  jsonSchema,
  type LanguageModel,
  type ModelMessage,
  stepCountIs,
} from "ai";

interface HostConfig {
  model: LanguageModel;
  temperature?: number;
  systemPrompt?: string;
  maxSteps?: number;
}

const DEFAULT_MAX_STEPS = 8;

const IN_PROCESS_URL = "http://in-process.skybridge.test/mcp";

const MAX_RESULT_CHARS = 2000;

function outputOf(
  results: { toolCallId: string; output?: unknown }[],
  toolCallId: string,
): string {
  const match = results.find((result) => result.toolCallId === toolCallId);
  if (match === undefined) {
    return "(no result)";
  }
  const rendered = JSON.stringify(match.output ?? null);
  return rendered.length > MAX_RESULT_CHARS
    ? `${rendered.slice(0, MAX_RESULT_CHARS)}… (truncated)`
    : rendered;
}

/**
 * A `fetch` replacement the transport dials instead of the network. Mirrors the
 * MCP client's own `fetch` option so an in-process app can serve the session.
 */
export type TransportFetch = (
  url: string | URL,
  init?: RequestInit,
) => Promise<Response>;

/**
 * One conversation against one MCP session. A scenario asserts on
 * {@link Chat.toolCalls}, the sequence of calls the model made.
 */
export class Chat<App = unknown> {
  /** Type-only anchor so `expect.chat` infers `App` from the conversation. */
  declare readonly $app: App;

  /** Every call the model made, in order, as it crossed the wire. */
  readonly toolCalls: ToolCall<App>[] = [];

  /** What the assistant said, one entry per turn, intermediate ones included. */
  readonly assistantTurns: string[] = [];

  /** Every turn and tool call in the order they happened, for the judge. */
  readonly transcript: TranscriptEntry[] = [];

  private readonly messages: ModelMessage[] = [];
  private readonly failures = new Map<string, string>();
  private readonly client: Client;
  private readonly transport: StreamableHTTPClientTransport;
  private readonly host: HostConfig;
  private tools: Tool[] = [];

  /** The model the conversation runs on, and the judge's default. */
  get model(): LanguageModel {
    return this.host.model;
  }

  private constructor(
    client: Client,
    transport: StreamableHTTPClientTransport,
    host: HostConfig,
  ) {
    this.client = client;
    this.transport = transport;
    this.host = host;
  }

  static async open<App>(
    host: HostConfig,
    fetchImpl: TransportFetch,
  ): Promise<Chat<App>> {
    const client = new Client({ name: "skybridge-eval", version: "0" });
    const transport = new StreamableHTTPClientTransport(
      new URL(IN_PROCESS_URL),
      { fetch: fetchImpl },
    );
    await client.connect(transport);
    const chat = new Chat<App>(client, transport, host);
    try {
      const { tools } = await client.listTools();
      chat.tools = tools;
    } catch (error) {
      await transport.close();
      throw error;
    }
    return chat;
  }

  /** Takes a turn. Assert on the result with `expect.chat`. */
  async send(prompt: string): Promise<void> {
    this.messages.push({ role: "user", content: prompt });
    this.transcript.push({ role: "user", text: prompt });

    const result = await generateText({
      model: this.host.model,
      temperature: this.host.temperature ?? 0,
      ...(this.host.systemPrompt === undefined
        ? {}
        : { system: this.host.systemPrompt }),
      messages: this.messages,
      tools: this.toolSet(),
      stopWhen: stepCountIs(this.host.maxSteps ?? DEFAULT_MAX_STEPS),
    });

    for (const step of result.steps) {
      if (step.text !== "") {
        this.assistantTurns.push(step.text);
        this.transcript.push({ role: "assistant", text: step.text });
      }
      for (const call of step.toolCalls) {
        const failure = this.failureFor(call);
        this.toolCalls.push({
          name: call.toolName,
          arguments: (call.input ?? {}) as Record<string, unknown>,
          ...failure,
        } as ToolCall<App>);
        const outcome =
          failure.failed === undefined
            ? ` -> ${outputOf(step.toolResults, call.toolCallId)}`
            : ` (failed: ${failure.failed})`;
        this.transcript.push({
          role: "tool",
          text: `${call.toolName} ${JSON.stringify(call.input ?? {})}${outcome}`,
        });
      }
    }

    this.messages.push(...result.response.messages);
  }

  async close(): Promise<void> {
    await this.transport.close();
  }

  private failureFor(call: { toolCallId: string; invalid?: boolean }): {
    failed?: string;
  } {
    const reported = this.failures.get(call.toolCallId);
    if (reported !== undefined) {
      return { failed: reported };
    }
    if (call.invalid === true) {
      return { failed: "the model's arguments could not be parsed" };
    }
    return {};
  }

  private toolSet() {
    const entries = this.tools.map((definition) => {
      const { $schema: _ignored, ...parameters } = definition.inputSchema;
      return [
        definition.name,
        dynamicTool({
          description: definition.description ?? "",
          inputSchema: jsonSchema(
            parameters as Parameters<typeof jsonSchema>[0],
          ),
          execute: async (input, { toolCallId }) => {
            let result: Awaited<ReturnType<Client["callTool"]>>;
            try {
              result = await this.client.callTool({
                name: definition.name,
                arguments: (input ?? {}) as Record<string, unknown>,
              });
            } catch (error) {
              this.failures.set(
                toolCallId,
                `the call never reached the server: ${error instanceof Error ? error.message : String(error)}`,
              );
              throw error;
            }
            if (result.isError === true) {
              this.failures.set(
                toolCallId,
                `the tool returned an error: ${JSON.stringify(result.content)}`,
              );
            }
            return result.content ?? result;
          },
        }),
      ] as const;
    });
    return Object.fromEntries(entries);
  }
}

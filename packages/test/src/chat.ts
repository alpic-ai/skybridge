import {
  Client,
  fromJsonSchema,
  type JsonSchemaType,
  StreamableHTTPClientTransport,
  type Tool,
} from "@modelcontextprotocol/client";
import {
  dynamicTool,
  generateText,
  type JSONSchema7,
  jsonSchema,
  type LanguageModel,
  type ModelMessage,
  stepCountIs,
  type UserContent,
} from "ai";
import { EvalMiddlewares } from "./eval-middlewares.js";
import { registerFileParameters } from "./matchers/matchers.js";
import type { ToolCall, Turn } from "./matchers/types.js";
import type { ToolStubs } from "./session-registry.js";

interface HostConfig {
  model: LanguageModel;
  temperature?: number;
  systemPrompt?: string;
  maxSteps?: number;
}

const DEFAULT_MAX_STEPS = 8;

const IN_PROCESS_URL = "http://in-process.skybridge.test/mcp";

function outputOf(
  results: { toolCallId: string; output?: unknown }[],
  toolCallId: string,
): unknown {
  return results.find((result) => result.toolCallId === toolCallId)?.output;
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

  /** Everything that happened, in the order it happened. */
  readonly turns: Turn<App>[] = [];

  /** Every call the model made, in order, as it crossed the wire. */
  get toolCalls(): ToolCall<App>[] {
    return this.turns
      .filter((turn) => turn.role === "tool")
      .map((turn) => turn.call);
  }

  /** What the assistant said, one entry per turn, intermediate ones included. */
  get assistantTurns(): string[] {
    return this.turns
      .filter((turn) => turn.role === "assistant")
      .map((turn) => turn.text);
  }

  private readonly messages: ModelMessage[] = [];
  private readonly failures = new Map<string, string>();
  private readonly client: Client;
  private readonly transport: StreamableHTTPClientTransport;
  private readonly host: HostConfig;
  private tools: Tool[] = [];
  private closePromise?: Promise<void>;
  private legacyStubs?: ToolStubs;

  /** The model the conversation runs on, and the judge's default. */
  get model(): LanguageModel {
    return this.host.model;
  }

  private constructor(
    client: Client,
    transport: StreamableHTTPClientTransport,
    host: HostConfig,
    private readonly middleware: EvalMiddlewares,
    private readonly dispose: () => Promise<void>,
  ) {
    this.client = client;
    this.transport = transport;
    this.host = host;
  }

  static async open<App>(
    host: HostConfig,
    fetchImpl: TransportFetch,
    middlewareOrStubs: EvalMiddlewares | ToolStubs,
    dispose: () => Promise<void> = async () => {},
  ): Promise<Chat<App>> {
    const middleware =
      middlewareOrStubs instanceof EvalMiddlewares
        ? middlewareOrStubs
        : new EvalMiddlewares();
    const client = new Client({ name: "skybridge-eval", version: "0" });
    const transport = new StreamableHTTPClientTransport(
      new URL(IN_PROCESS_URL),
      { fetch: fetchImpl },
    );
    const chat = new Chat<App>(client, transport, host, middleware, dispose);
    try {
      await client.connect(transport);
      const { tools } = await client.listTools();
      chat.tools = tools;
      if (!(middlewareOrStubs instanceof EvalMiddlewares)) {
        chat.legacyStubs = middlewareOrStubs;
        const unknown = Object.keys(middlewareOrStubs).filter(
          (name) => !tools.some((tool) => tool.name === name),
        );
        if (unknown.length) {
          throw new Error(
            `the app exposes no tool named ${unknown.map((name) => `"${name}"`).join(", ")}, so the stub would never run`,
          );
        }
      }
      registerFileParameters(chat, middleware.fileParams);
    } catch (error) {
      await transport.close();
      throw error;
    }
    return chat;
  }

  /** Takes a turn. Assert on the result with `expect.chat`. */
  async send(content: UserContent): Promise<void> {
    if (this.closePromise) {
      throw new Error("The conversation is closed");
    }
    const prepared = await this.middleware.files.prepare(content);
    this.middleware.inputs.clear();
    this.failures.clear();
    this.messages.push({ role: "user", content: prepared });
    this.turns.push({
      role: "user",
      text:
        typeof prepared === "string"
          ? prepared
          : prepared
              .filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("\n"),
    });

    const result = await generateText({
      model: this.host.model,
      ...(this.host.temperature === undefined
        ? {}
        : { temperature: this.host.temperature }),
      ...(this.host.systemPrompt === undefined
        ? {}
        : { system: this.host.systemPrompt }),
      messages: this.messages,
      tools: this.toolSet(),
      stopWhen: stepCountIs(this.host.maxSteps ?? DEFAULT_MAX_STEPS),
    });

    for (const step of result.steps) {
      if (step.text !== "") {
        this.turns.push({ role: "assistant", text: step.text });
      }
      for (const call of step.toolCalls) {
        this.turns.push({
          role: "tool",
          call: {
            name: call.toolName,
            arguments:
              this.middleware.inputs.get(call.toolCallId) ??
              ((call.input ?? {}) as Record<string, unknown>),
            ...this.failureFor(call),
          } as ToolCall<App>,
          result: outputOf(step.toolResults, call.toolCallId),
        });
      }
    }

    this.messages.push(...result.response.messages);
  }

  close() {
    this.closePromise ??= (async () => {
      try {
        await this.transport.close();
      } finally {
        try {
          await this.middleware.files.close();
        } finally {
          await this.dispose();
        }
      }
    })();
    return this.closePromise;
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
      const schema = fromJsonSchema(parameters as JsonSchemaType);
      return [
        definition.name,
        dynamicTool({
          description: definition.description ?? "",
          inputSchema: jsonSchema(parameters as JSONSchema7, {
            validate: async (input) => {
              const result = await schema["~standard"].validate(input);
              return result.issues
                ? {
                    success: false,
                    error: new Error(JSON.stringify(result.issues)),
                  }
                : { success: true, value: result.value };
            },
          }),
          execute: async (input, { toolCallId }) => {
            const stubbed = await this.legacyStubs?.[definition.name]?.(
              (input ?? {}) as Record<string, unknown>,
            );
            if (stubbed !== undefined) {
              return {
                content: [
                  {
                    type: "text",
                    text:
                      typeof stubbed === "string"
                        ? stubbed
                        : JSON.stringify(stubbed),
                  },
                ],
              };
            }
            let result: Awaited<ReturnType<Client["callTool"]>>;
            try {
              result = await this.client.callTool({
                name: definition.name,
                arguments: (input ?? {}) as Record<string, unknown>,
                _meta: { "skybridge/evalToolCallId": toolCallId },
              });
            } catch (error) {
              this.failures.set(
                toolCallId,
                `the tool call failed: ${error instanceof Error ? error.message : String(error)}`,
              );
              throw error;
            }
            if (result.isError === true) {
              this.failures.set(
                toolCallId,
                `the tool returned an error: ${JSON.stringify(result.content)}`,
              );
            }
            return {
              content: result.content,
              structuredContent: result.structuredContent,
            };
          },
        }),
      ] as const;
    });
    return Object.fromEntries(entries);
  }
}

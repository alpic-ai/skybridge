import {
  fromJsonSchema,
  type JSONRPCMessage,
  type JsonSchemaType,
  type Tool,
} from "@modelcontextprotocol/client";
import type { JSONSchema7 } from "ai";
import type { StubMap, TransportFetch } from "./chat.js";
import { InputFiles } from "./input-files.js";

function fileInputSchema(
  schema: JSONSchema7 | boolean | undefined,
  allowArray = true,
): JSONSchema7 {
  if (!schema || typeof schema === "boolean") {
    throw new Error("expected a FileRef schema");
  }
  if (schema.anyOf) {
    if (
      schema.anyOf.every(
        (branch) => typeof branch !== "boolean" && branch.type === "null",
      )
    ) {
      throw new Error("expected a FileRef schema");
    }
    return {
      ...schema,
      anyOf: schema.anyOf.map((branch) =>
        typeof branch !== "boolean" && branch.type === "null"
          ? branch
          : fileInputSchema(branch, allowArray),
      ),
    };
  }
  if (allowArray && schema.type === "array" && !Array.isArray(schema.items)) {
    return { ...schema, items: fileInputSchema(schema.items, false) };
  }
  const fields = ["download_url", "file_id", "mime_type", "file_name"];
  if (
    schema.type !== "object" ||
    (schema.additionalProperties !== undefined &&
      schema.additionalProperties !== false) ||
    schema.required?.length !== 2 ||
    !["download_url", "file_id"].every((field) =>
      schema.required?.includes(field),
    ) ||
    Object.keys(schema.properties ?? {}).length !== fields.length ||
    !fields.every((field) => {
      const property = schema.properties?.[field];
      return typeof property === "object" && property.type === "string";
    })
  ) {
    throw new Error("expected a FileRef schema");
  }
  return {
    type: "string",
    description: "This parameter expects an absolute local file path.",
  };
}

export class EvalMiddleware {
  readonly files = new InputFiles();
  readonly inputs = new Map<string, Record<string, unknown>>();
  readonly fileParams = new Map<string, string[]>();
  private readonly schemas = new Map<
    string,
    ReturnType<typeof fromJsonSchema>
  >();

  constructor(
    private readonly next: TransportFetch,
    private readonly stubs: StubMap,
  ) {}

  private toolList(message: JSONRPCMessage) {
    if (!("result" in message) || !Array.isArray(message.result.tools)) {
      return message;
    }
    const tools = message.result.tools as Tool[];
    const unknownStubs = Object.keys(this.stubs).filter(
      (name) => !tools.some((tool) => tool.name === name),
    );
    if (unknownStubs.length > 0) {
      throw new Error(
        `the app exposes no tool named ${unknownStubs.map((name) => `"${name}"`).join(", ")}, so the stub would never run`,
      );
    }
    return {
      ...message,
      result: {
        ...message.result,
        tools: tools.map((tool) => {
          this.schemas.set(
            tool.name,
            fromJsonSchema(tool.inputSchema as JsonSchemaType),
          );
          const fields = tool._meta?.["openai/fileParams"] ?? [];
          if (
            !Array.isArray(fields) ||
            !fields.every((field) => typeof field === "string")
          ) {
            throw new Error(
              `Invalid openai/fileParams for "${tool.name}": expected parameter names`,
            );
          }
          this.fileParams.set(tool.name, fields);
          const properties = { ...tool.inputSchema.properties } as NonNullable<
            JSONSchema7["properties"]
          >;
          for (const field of fields) {
            try {
              properties[field] = fileInputSchema(
                properties[field] as JSONSchema7 | boolean | undefined,
              );
            } catch {
              throw new Error(
                `Invalid openai/fileParams for "${tool.name}.${field}": expected a FileRef schema (or an optional, nullable, or array form)`,
              );
            }
          }
          return { ...tool, inputSchema: { ...tool.inputSchema, properties } };
        }),
      },
    };
  }

  async fetch(url: string | URL, init?: RequestInit) {
    if (typeof init?.body !== "string") {
      return this.next(url, init);
    }
    const message = JSON.parse(init.body) as JSONRPCMessage;
    if ("method" in message && message.method === "tools/call") {
      const params = message.params as {
        name: string;
        arguments?: Record<string, unknown>;
        _meta?: Record<string, unknown>;
      };
      const args = this.files.rewrite(
        params.arguments ?? {},
        this.fileParams.get(params.name) ?? [],
      );
      const callId = params._meta?.["skybridge/evalToolCallId"];
      if (typeof callId === "string") {
        this.inputs.set(callId, args);
      }
      const validation = await this.schemas
        .get(params.name)
        ?.["~standard"].validate(args);
      if (validation?.issues) {
        throw new Error(
          `Invalid tool arguments for "${params.name}": ${JSON.stringify(validation.issues)}`,
        );
      }
      const stubbed = await this.stubs[params.name]?.(args);
      if (stubbed !== undefined) {
        return Response.json({
          jsonrpc: "2.0",
          id: "id" in message ? message.id : null,
          result: {
            content: [
              {
                type: "text",
                text:
                  typeof stubbed === "string"
                    ? stubbed
                    : JSON.stringify(stubbed),
              },
            ],
          },
        });
      }
      init = {
        ...init,
        body: JSON.stringify({
          ...message,
          params: { ...params, arguments: args },
        }),
      };
    }
    const response = await this.next(url, init);
    if (!("method" in message) || message.method !== "tools/list") {
      return response;
    }
    const text = await response.text();
    const body = response.headers
      .get("content-type")
      ?.includes("text/event-stream")
      ? text
          .split("\n")
          .map((line) =>
            line.startsWith("data: ")
              ? `data: ${JSON.stringify(this.toolList(JSON.parse(line.slice(6))))}`
              : line,
          )
          .join("\n")
      : JSON.stringify(this.toolList(JSON.parse(text)));
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(body, { status: response.status, headers });
  }
}

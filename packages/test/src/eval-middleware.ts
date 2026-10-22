import {
  fromJsonSchema,
  type JsonSchemaType,
  type Tool,
} from "@modelcontextprotocol/client";
import type { JSONSchema7 } from "ai";
import type { McpServer } from "skybridge/server";
import type { StubMap } from "./chat.js";
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

  constructor(private readonly stubs: StubMap) {}

  private toolList(tools: Tool[]) {
    const unknownStubs = Object.keys(this.stubs).filter(
      (name) => !tools.some((tool) => tool.name === name),
    );
    if (unknownStubs.length > 0) {
      throw new Error(
        `the app exposes no tool named ${unknownStubs.map((name) => `"${name}"`).join(", ")}, so the stub would never run`,
      );
    }
    return tools.map((tool) => {
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
    });
  }

  install(server: Pick<McpServer, "mcpMiddleware">) {
    server.mcpMiddleware("tools/list", async (_request, _extra, next) => {
      const result = await next();
      return { ...result, tools: this.toolList(result.tools) };
    });
    server.mcpMiddleware("tools/call", async (request, _extra, next) => {
      const params = request.params;
      const args = this.files.rewrite(
        params.arguments ?? {},
        this.fileParams.get(params.name) ?? [],
      );
      params.arguments = args as NonNullable<typeof params.arguments>;
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
        return {
          content: [
            {
              type: "text",
              text:
                typeof stubbed === "string" ? stubbed : JSON.stringify(stubbed),
            },
          ],
        };
      }
      return next();
    });
  }
}

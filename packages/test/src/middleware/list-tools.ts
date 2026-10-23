import type { Tool } from "@modelcontextprotocol/client";
import type { JSONSchema7 } from "ai";
import type { McpMiddlewareFn } from "skybridge/server";
import type { ToolStubs } from "../session-registry.js";

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

export function createListToolsMiddleware(
  fileParams: Map<string, string[]>,
  stubs: ToolStubs,
): McpMiddlewareFn {
  function toolList(tools: Tool[]) {
    return tools.map((tool) => {
      const fields = tool._meta?.["openai/fileParams"] ?? [];
      if (
        !Array.isArray(fields) ||
        !fields.every((field) => typeof field === "string")
      ) {
        throw new Error(
          `Invalid openai/fileParams for "${tool.name}": expected parameter names`,
        );
      }
      fileParams.set(tool.name, fields);
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

  return async (_request, _extra, next) => {
    const result = (await next()) as { tools: Tool[] };
    const unknown = Object.keys(stubs).filter(
      (name) => !result.tools.some((tool) => tool.name === name),
    );
    if (unknown.length) {
      throw new Error(
        `the app exposes no tool named ${unknown.map((name) => `"${name}"`).join(", ")}, so the stub would never run`,
      );
    }
    return { ...result, tools: toolList(result.tools) };
  };
}

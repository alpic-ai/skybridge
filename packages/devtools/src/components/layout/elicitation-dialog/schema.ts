import type { ElicitRequestParams } from "@modelcontextprotocol/client";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";

type Field = RJSFSchema & {
  "x-openai-input"?: {
    options: { uri: string; name?: string; description?: string }[];
    selection?: "explicit" | "implicit";
    userOptions?: object;
  };
  "x-openai-suggestions"?: { const: string }[];
};

function withExamples(field: Field): RJSFSchema {
  const { "x-openai-suggestions": suggestions, ...rest } = field;
  return suggestions
    ? { ...rest, examples: suggestions.map((suggestion) => suggestion.const) }
    : field;
}

export function getRequestedSchema(params: ElicitRequestParams): RJSFSchema {
  const meta = params._meta?.["openai/elicitation"] as
    | { requestedSchema?: RJSFSchema }
    | undefined;
  return (
    meta?.requestedSchema ??
    ("requestedSchema" in params ? (params.requestedSchema as RJSFSchema) : {})
  );
}

function hasItemOptions(field: RJSFSchema): boolean {
  return isObject(field.items) && field.items.anyOf !== undefined;
}

function toField(field: Field): RJSFSchema {
  const { "x-openai-input": input, format: _format, ...rest } = field;
  if (!input) {
    if (hasItemOptions(field)) {
      return { ...field, uniqueItems: true };
    }
    return isObject(field.items)
      ? { ...withExamples(field), items: withExamples(field.items as Field) }
      : withExamples(field);
  }
  if (input.userOptions || input.selection === "implicit") {
    const examples = input.options.map((option) => option.uri);
    return field.type === "array"
      ? { ...rest, items: { type: "string", format: "uri", examples } }
      : { ...rest, format: "uri", examples };
  }
  const options = input.options.map((option) => ({
    const: option.uri,
    title: option.name ?? option.uri,
    description: option.description,
  }));
  return field.type === "array"
    ? { ...rest, uniqueItems: true, items: { type: "string", anyOf: options } }
    : { ...rest, oneOf: options };
}

function toUiField(field: RJSFSchema): UiSchema | undefined {
  if (field.oneOf || hasItemOptions(field)) {
    return { "ui:widget": "OptionsWidget" };
  }
  return undefined;
}

export function toFormSchema(schema: RJSFSchema): {
  schema: RJSFSchema;
  uiSchema: UiSchema;
} {
  const properties = Object.fromEntries(
    Object.entries(schema.properties ?? {}).map(([name, field]) => [
      name,
      toField(field as Field),
    ]),
  );
  const uiSchema: UiSchema = { "ui:submitButtonOptions": { norender: true } };
  for (const [name, field] of Object.entries(properties)) {
    const uiField = toUiField(field);
    if (uiField) {
      uiSchema[name] = uiField;
    }
  }
  return { schema: { ...schema, properties }, uiSchema };
}

function isObject(value: unknown): value is RJSFSchema {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

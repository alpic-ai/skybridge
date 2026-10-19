import type { ElicitRequestParams } from "@modelcontextprotocol/client";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";

type Field = RJSFSchema & {
  "x-openai-input"?: {
    options: { uri: string; name?: string; description?: string }[];
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

export function toContent(
  formData: Record<string, unknown> = {},
): Record<string, string | number | boolean | string[]> {
  return Object.fromEntries(
    Object.entries(formData).filter(
      ([, value]) => !(Array.isArray(value) && value.length === 0),
    ),
  ) as Record<string, string | number | boolean | string[]>;
}

function isObject(value: unknown): value is RJSFSchema {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

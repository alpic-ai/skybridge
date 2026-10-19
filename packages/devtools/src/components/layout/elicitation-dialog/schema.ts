import type { ElicitRequestParams } from "@modelcontextprotocol/client";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";

type Field = RJSFSchema & {
  "x-openai-input"?: {
    options: { uri: string; name?: string; description?: string }[];
  };
  "x-openai-suggestions"?: unknown[];
};

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
    return hasItemOptions(field) ? { ...field, uniqueItems: true } : field;
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
  if ("x-openai-suggestions" in field) {
    return { "ui:widget": "SuggestionsWidget" };
  }
  if (isObject(field.items) && "x-openai-suggestions" in field.items) {
    return { items: { "ui:widget": "SuggestionsWidget" } };
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
  schema: RJSFSchema,
  formData: Record<string, unknown> | undefined,
): Record<string, string | number | boolean | string[]> {
  return Object.fromEntries(
    Object.keys(schema.properties ?? {})
      .map((name) => [name, formData?.[name]] as const)
      .filter(
        (entry): entry is [string, string | number | boolean | string[]] =>
          entry[1] !== undefined &&
          entry[1] !== null &&
          entry[1] !== "" &&
          !(Array.isArray(entry[1]) && entry[1].length === 0),
      ),
  );
}

function isObject(value: unknown): value is RJSFSchema {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

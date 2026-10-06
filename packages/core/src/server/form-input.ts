import {
  type ElicitRequestFormParams,
  type ElicitResult,
  fromJsonSchema,
  type Icon,
  type InputRequiredResult,
  type PrimitiveSchemaDefinition,
  type Resource,
  type StringSchema,
} from "@modelcontextprotocol/server";

/** A titled choice, with an optional description and thumbnail. */
export interface OpenAIFormOption {
  const: string;
  title: string;
  description?: string;
  /** An HTTPS URL or a base64 data URI. */
  "x-openai-thumbnail"?: Icon;
}

/** A string field that accepts a `pattern` and suggested values. */
export type OpenAIFormStringField = StringSchema & {
  pattern?: string;
  "x-openai-suggestions"?: OpenAIFormOption[];
};

/** Resources the user picks from, or adds, in a resource field. */
export interface OpenAIResourceInput {
  type: "resource";
  /** Multi-select only. Defaults to `"explicit"`. */
  selection?: "explicit" | "implicit";
  options: Resource[];
  userOptions?: { kind?: "file" | "directory"; accept?: string[] };
}

type FieldText = { title?: string; description?: string };
type ArrayBounds = FieldText & { minItems?: number; maxItems?: number };

/** One field of an {@link OpenAIForm}. */
export type OpenAIFormField =
  | PrimitiveSchemaDefinition
  | OpenAIFormStringField
  | (FieldText & {
      type: "string";
      oneOf: OpenAIFormOption[];
      default?: string;
    })
  | (ArrayBounds & {
      type: "array";
      items: { anyOf: OpenAIFormOption[] };
      default?: string[];
    })
  | (ArrayBounds & {
      type: "array";
      uniqueItems?: boolean;
      items: OpenAIFormStringField;
      default?: string[];
    })
  | (FieldText & {
      type: "string";
      format: "uri";
      "x-openai-input": Omit<OpenAIResourceInput, "selection">;
      default?: string;
    })
  | (ArrayBounds & {
      type: "array";
      items: { type: "string"; format: "uri" };
      "x-openai-input": OpenAIResourceInput;
      default?: string[];
    });

/** A form for ChatGPT, from the OpenAI MCP extensions. */
export interface OpenAIForm {
  type: "object";
  properties: Record<string, OpenAIFormField>;
  required?: string[];
}

export type OpenAIFormInputParams = Omit<
  ElicitRequestFormParams,
  "mode" | "requestedSchema"
> & {
  /** Identifies the form across the two calls of the tool. */
  key: string;
  requestedSchema: OpenAIForm;
  requestState?: string;
};

/** The user's answer to an {@link OpenAIForm}. */
export type OpenAIFormResult =
  | {
      action: "accept";
      content: Record<string, string | number | boolean | string[]>;
    }
  | { action: "decline" | "cancel" };

type FormInputExtra = {
  mcpReq: {
    envelope?: object;
    inputResponses?: Record<string, unknown>;
  };
};

function supportsOpenAIForms(envelope: object | undefined): boolean {
  const {
    "io.modelcontextprotocol/protocolVersion": version,
    "io.modelcontextprotocol/clientCapabilities": capabilities,
  } = (envelope ?? {}) as {
    "io.modelcontextprotocol/protocolVersion"?: string;
    "io.modelcontextprotocol/clientCapabilities"?: {
      elicitation?: { form?: object };
      extensions?: { "openai/elicitation"?: { form?: object } };
    };
  };
  return (
    version !== undefined &&
    version >= "2026-07-28" &&
    capabilities?.elicitation?.form !== undefined &&
    capabilities.extensions?.["openai/elicitation"]?.form !== undefined
  );
}

function picksOfferedResources(field: OpenAIFormField, value: unknown) {
  if (!("x-openai-input" in field) || value === undefined) {
    return true;
  }
  const input = field["x-openai-input"];
  if (
    input.userOptions !== undefined ||
    ("selection" in input && input.selection === "implicit")
  ) {
    return true;
  }
  return [value]
    .flat()
    .every((uri) => input.options.some((option) => option.uri === uri));
}

/**
 * Ask the user to fill a form in ChatGPT, from the OpenAI MCP extensions.
 * Return the result when it is an `input_required` result: ChatGPT shows the
 * form, then calls the tool again, and the same call returns the user's answer.
 *
 * @example
 * ```ts
 * server.registerTool({ name: "pick-part" }, (_args, extra) => {
 *   const result = requestFormInput(extra, {
 *     key: "part",
 *     message: "Choose a part",
 *     requestedSchema: {
 *       type: "object",
 *       properties: {
 *         part: { type: "string", oneOf: [{ const: "bolt", title: "M6 bolt" }] },
 *       },
 *       required: ["part"],
 *     },
 *   });
 *   if ("resultType" in result) {
 *     return result;
 *   }
 *   return {
 *     content: result.action === "accept" ? `Picked ${result.content.part}` : "Nothing picked",
 *   };
 * });
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/request-form-input
 */
export function requestFormInput(
  extra: FormInputExtra,
  {
    key,
    requestedSchema,
    requestState,
    _meta,
    ...params
  }: OpenAIFormInputParams,
): InputRequiredResult | OpenAIFormResult {
  if (!supportsOpenAIForms(extra.mcpReq.envelope)) {
    throw new Error(
      "OpenAI forms need MCP 2026-07-28 or newer and a client that supports openai/elicitation forms.",
    );
  }
  const responses = extra.mcpReq.inputResponses;
  if (responses !== undefined && Object.hasOwn(responses, key)) {
    const response = responses[key] as Partial<ElicitResult> | null;
    if (response?.action === "decline" || response?.action === "cancel") {
      return { action: response.action };
    }
    if (response?.action !== "accept") {
      throw new Error(`The answer to form "${key}" has no valid action.`);
    }
    const validated = fromJsonSchema<
      Extract<OpenAIFormResult, { action: "accept" }>["content"]
    >(requestedSchema as object)["~standard"].validate(response.content);
    if (
      "then" in validated ||
      validated.issues ||
      !Object.entries(requestedSchema.properties).every(([name, field]) =>
        picksOfferedResources(field, validated.value?.[name]),
      )
    ) {
      throw new Error(`The answer to form "${key}" does not match its schema.`);
    }
    return { action: "accept", content: validated.value };
  }
  return {
    resultType: "input_required",
    inputRequests: {
      [key]: {
        method: "elicitation/create",
        params: {
          ...params,
          mode: "form",
          requestedSchema: { type: "object", properties: {} },
          _meta: { ..._meta, "openai/elicitation": { requestedSchema } },
        },
      },
    },
    ...(requestState !== undefined && { requestState }),
  };
}

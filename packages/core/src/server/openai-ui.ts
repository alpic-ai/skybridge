import type { StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import type { OpenAIEntrypoint, OpenAIToolConfig } from "./server.js";

type InputSchema =
  | Record<string, StandardSchemaWithJSON>
  | StandardSchemaWithJSON
  | undefined;

type EmptyInputCheck = "accepted" | "rejected" | "async";

function check(
  schema: StandardSchemaWithJSON,
  value: unknown,
): EmptyInputCheck {
  const result = schema["~standard"].validate(value);
  if (result instanceof Promise) {
    return "async";
  }
  return result.issues ? "rejected" : "accepted";
}

function checkEmptyInput(inputSchema: InputSchema): EmptyInputCheck {
  if (inputSchema === undefined) {
    return "accepted";
  }
  if ("~standard" in inputSchema) {
    return check(inputSchema as StandardSchemaWithJSON, {});
  }
  const results = Object.values(inputSchema).map((schema) =>
    check(schema, undefined),
  );
  if (results.includes("rejected")) {
    return "rejected";
  }
  return results.includes("async") ? "async" : "accepted";
}

function toWire(entrypoint: OpenAIEntrypoint): Record<string, unknown> {
  if (entrypoint === "global" || entrypoint === "thread") {
    return { type: entrypoint };
  }
  if ("global" in entrypoint) {
    return { type: "global", ...entrypoint.global };
  }
  if ("file" in entrypoint) {
    return { type: "file", extensions: entrypoint.file };
  }
  return { type: "settings", ...entrypoint.settings };
}

function definedEntries(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  );
}

export function buildOpenAIUiMeta(
  toolName: string,
  openai: OpenAIToolConfig,
  { hasView, inputSchema }: { hasView: boolean; inputSchema: InputSchema },
): { tool: Record<string, unknown>; resource: Record<string, unknown> } {
  const fail = (reason: string) => {
    throw new Error(`skybridge: tool "${toolName}" ${reason}`);
  };
  if (!hasView) {
    fail("sets `openai` options but has no `view`.");
  }
  const { entrypoints, availableDisplayModes, preferredDisplayMode } = openai;
  const opensWithoutInput = entrypoints?.some(
    (entrypoint) =>
      entrypoint === "global" ||
      entrypoint === "thread" ||
      (typeof entrypoint === "object" && "global" in entrypoint),
  );
  const emptyInput = opensWithoutInput
    ? checkEmptyInput(inputSchema)
    : "accepted";
  if (emptyInput === "rejected") {
    fail(
      "has a global or thread entrypoint, so ChatGPT calls it with `{}`, but its input schema rejects `{}`. Make every input optional.",
    );
  }
  if (emptyInput === "async") {
    fail(
      "has a global or thread entrypoint, so ChatGPT calls it with `{}`, but its input schema validates asynchronously and Skybridge can't check that it accepts `{}` at startup. Use a synchronous schema.",
    );
  }
  for (const entrypoint of entrypoints ?? []) {
    if (typeof entrypoint === "object" && "file" in entrypoint) {
      const invalid = entrypoint.file.find((ext) => !ext.startsWith("."));
      if (invalid !== undefined) {
        fail(
          `has a file entrypoint extension "${invalid}" that doesn't start with ".".`,
        );
      }
    }
  }
  for (const [field, mode] of [
    ["preferredDisplayMode", preferredDisplayMode],
    ["preferredModelDisplayMode", openai.preferredModelDisplayMode],
  ] as const) {
    if (
      mode !== undefined &&
      availableDisplayModes !== undefined &&
      !availableDisplayModes.includes(mode)
    ) {
      fail(
        `sets ${field} to "${mode}", which isn't in its availableDisplayModes.`,
      );
    }
  }

  return {
    tool: definedEntries({
      entrypoints: entrypoints?.map(toWire),
      preferredModelDisplayMode: openai.preferredModelDisplayMode,
    }),
    resource: definedEntries({ availableDisplayModes, preferredDisplayMode }),
  };
}

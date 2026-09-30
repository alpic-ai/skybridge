import type { StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import type { OpenAIEntrypoint, OpenAIToolConfig } from "./server.js";

type InputSchema =
  | Record<string, StandardSchemaWithJSON>
  | StandardSchemaWithJSON
  | undefined;

function accepts(schema: StandardSchemaWithJSON, value: unknown): boolean {
  const result = schema["~standard"].validate(value);
  return result instanceof Promise || !result.issues;
}

function acceptsEmptyInput(inputSchema: InputSchema): boolean {
  if (inputSchema === undefined) {
    return true;
  }
  if ("~standard" in inputSchema) {
    return accepts(inputSchema as StandardSchemaWithJSON, {});
  }
  return Object.values(inputSchema).every((schema) =>
    accepts(schema, undefined),
  );
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
  if (opensWithoutInput && !acceptsEmptyInput(inputSchema)) {
    fail(
      "has a global or thread entrypoint, so ChatGPT calls it with `{}`, but its input schema rejects `{}`. Make every input optional.",
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
  if (
    preferredDisplayMode !== undefined &&
    availableDisplayModes !== undefined &&
    !availableDisplayModes.includes(preferredDisplayMode)
  ) {
    fail(
      `prefers the "${preferredDisplayMode}" display mode, which isn't in its availableDisplayModes.`,
    );
  }

  return {
    tool: definedEntries({
      entrypoints: entrypoints?.map(toWire),
      preferredModelDisplayMode: openai.preferredModelDisplayMode,
    }),
    resource: definedEntries({ availableDisplayModes, preferredDisplayMode }),
  };
}

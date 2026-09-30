import { ContentBlockSchema } from "@modelcontextprotocol/core";
import { useCallback, useMemo } from "react";
import * as z from "zod/v4";
import { getAdaptor, useMcpAppContext } from "../bridges/index.js";
import type { OpenAIHostContext } from "../bridges/mcp-app/types.js";
import type { ModelContextParams } from "../bridges/types.js";
import { useHost } from "./use-host.js";

const ModelContextSchema = z
  .object({
    updateId: z.string().min(1),
    content: z.array(ContentBlockSchema).optional(),
    structuredContent: z.record(z.string(), z.unknown()).optional(),
  })
  .nullable();

/** Model context the view attached, as ChatGPT reports it back. */
export type ModelContextState = OpenAIHostContext["openai/modelContext"];

/**
 * Send content to the model through the MCP Apps `ui/update-model-context`
 * request. Each `update` replaces what this hook sent before, and is merged
 * with the {@link useViewState} state, which the view state wins on shared
 * `structuredContent` keys.
 *
 * ChatGPT also reads the OpenAI presentation metadata, shows each block as a
 * composer attachment and reports the attached context back:
 * `_meta["openai/title"]`, `_meta["openai/thumbnail"]` on text blocks, and
 * `annotations.audience: ["assistant"]` to hide a block from the user.
 *
 * - `supported`: whether the host advertises `updateModelContext`.
 * - `context`: ChatGPT only, the attached context; `null` once the user
 *   removed it, `undefined` when the host never reported one.
 * - `update`: replaces the context. Rejects with `NotSupportedError` on hosts
 *   that don't advertise model context updates.
 *
 * @example
 * ```tsx
 * const { supported, update } = useModelContext();
 * update({
 *   content: [
 *     {
 *       type: "text",
 *       text: "Selected: M6 hex bolt",
 *       _meta: { "openai/title": "Hex bolt" },
 *     },
 *   ],
 * });
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/use-model-context
 */
export function useModelContext(): {
  supported: boolean;
  context: ModelContextState;
  update: (params: ModelContextParams) => Promise<void>;
} {
  const { capabilities, openai } = useHost();
  const reported = useMcpAppContext("openai/modelContext");
  const context = useMemo(() => {
    if (reported === undefined) {
      return undefined;
    }
    const parsed = ModelContextSchema.safeParse(reported);
    return parsed.success ? (parsed.data as ModelContextState) : undefined;
  }, [reported]);
  const update = useCallback(
    (params: ModelContextParams) => getAdaptor().updateModelContext(params),
    [],
  );

  return {
    supported: Boolean(capabilities?.updateModelContext) || openai.modelContext,
    context,
    update,
  };
}

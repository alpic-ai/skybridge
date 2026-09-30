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

/** Current model context attached by the view, as reported by ChatGPT. */
export type ModelContextState = OpenAIHostContext["openai/modelContext"];

/**
 * Attach content to the conversation as composer attachments, and follow
 * what ChatGPT reports back. Each `update` replaces the context this view
 * attached before. Content blocks accept the OpenAI presentation metadata:
 * `_meta["openai/title"]`, `_meta["openai/thumbnail"]` on text blocks, and
 * `annotations.audience: ["assistant"]` to hide a block from the user.
 *
 * - `supported`: whether the host advertises `openai/modelContext`.
 * - `context`: the attached context; `null` once the user removed it,
 *   `undefined` when the host never reported one.
 * - `update`: replaces the context. Rejects with `NotSupportedError` on hosts
 *   that don't advertise the extension.
 *
 * Pair it with `useViewState(state, { modelContext: false })`, since a shared
 * view state also writes the model context and would replace these
 * attachments.
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
  const { openai } = useHost();
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

  return { supported: openai.modelContext, context, update };
}

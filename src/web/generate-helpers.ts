import {
  useCallTool,
  type CallToolState,
  type CallToolFn,
  type CallToolAsyncFn,
} from "./hooks/use-call-tool.js";
import { useToolInfo, type ToolState } from "./hooks/use-tool-info.js";
import type { InferTools, ToolInput, ToolOutput } from "../server/index.js";
import type { CallToolResponse, Prettify, Objectify } from "./types.js";

type TypedCallToolResponse<TOutput> = CallToolResponse & { structuredContent: TOutput };

type TypedCallToolReturn<TInput, TOutput> = Prettify<
  CallToolState<TypedCallToolResponse<TOutput>> & {
    callTool: CallToolFn<TInput, TypedCallToolResponse<TOutput>>;
    callToolAsync: CallToolAsyncFn<TInput, TypedCallToolResponse<TOutput>>;
  }
>;

type TypedToolInfoReturn<TInput, TOutput> = ToolState<
  Objectify<TInput>,
  Objectify<TOutput>,
  Objectify<{}>
>;

/**
 * Creates typed versions of skybridge hooks with full type inference
 * for tool names, inputs, and outputs.
 *
 * This is the recommended way to use skybridge hooks in your widgets.
 * Set this up once in a dedicated file and export the typed hooks for use across your app.
 *
 * @typeParam ServerType - The type of your McpServer instance (use `typeof server`).
 *                         Must be a server instance created with method chaining.
 *                         TypeScript will validate that tools can be inferred from this type.
 *
 * @example
 * ```typescript
 * // server/src/index.ts
 * const server = new McpServer({ name: "my-app", version: "1.0" }, {})
 *   .widget("search-voyage", {}, {
 *     inputSchema: { destination: z.string() },
 *     outputSchema: { results: z.array(z.string()) },
 *   }, async ({ destination }) => {
 *     return { content: [{ type: "text", text: `Found trips to ${destination}` }] };
 *   });
 *
 * export type AppType = typeof server;
 * ```
 *
 * @example
 * ```typescript
 * // web/src/skybridge.ts (one-time setup)
 * import type { AppType } from "../server";
 * import { generateHelpers } from "skybridge/web";
 *
 * export const { useCallTool, useToolInfo } = generateHelpers<AppType>();
 * ```
 *
 * @example
 * ```typescript
 * // web/src/widgets/search.tsx (usage)
 * import { useCallTool, useToolInfo } from "../skybridge";
 *
 * export function SearchWidget() {
 *   const { callTool, data } = useCallTool("search-voyage");
 *   //                                      ^ autocomplete for tool names
 *   callTool({ destination: "Spain" });
 *   //         ^ autocomplete for input fields
 *
 *   const toolInfo = useToolInfo<"search-voyage">();
 *   //                              ^ autocomplete for widget names
 *   // toolInfo.input is typed based on widget input schema
 *   // toolInfo.output.structuredContent is typed based on widget output schema
 * }
 * ```
 */
export function generateHelpers<ServerType = never>() {
  type Tools = InferTools<ServerType>;
  type ToolNames = keyof Tools & string;

  return {
    /**
     * Typed version of `useCallTool` that provides autocomplete for tool names
     * and type inference for inputs and outputs.
     *
     * @param name - The name of the widget to call. Autocompletes based on your server's widget registry.
     * @returns A hook with typed `callTool` function and `data` property.
     *
     * @example
     * ```typescript
     * const { callTool, data, isPending } = useCallTool("search-voyage");
     * // TypeScript knows callTool expects { destination: string }
     * callTool({ destination: "Spain" });
     *
     * // data.structuredContent is typed based on your outputSchema
     * if (data) {
     *   console.log(data.structuredContent.results);
     * }
     * ```
     */
    useCallTool: <ToolName extends ToolNames>(
      name: ToolName
    ): TypedCallToolReturn<ToolInput<ServerType, ToolName>, ToolOutput<ServerType, ToolName>> => {
      return useCallTool(name) as TypedCallToolReturn<
        ToolInput<ServerType, ToolName>,
        ToolOutput<ServerType, ToolName>
      >;
    },

    /**
     * Typed version of `useToolInfo` that provides autocomplete for widget names
     * and type inference for inputs, outputs, and responseMetadata.
     *
     * @typeParam K - The name of the widget. Autocompletes based on your server's widget registry.
     * @returns A discriminated union with `status: "pending" | "success"` that narrows correctly.
     *
     * @example
     * ```typescript
     * const toolInfo = useToolInfo<"search-voyage">();
     * // toolInfo.input is typed as { destination: string; ... }
     * // toolInfo.output is typed as { results: Array<...>; ... }
     * // toolInfo.status narrows correctly: "pending" | "success"
     *
     * if (toolInfo.isPending) {
     *   // TypeScript knows output is undefined here
     *   console.log(toolInfo.input.destination);
     * }
     *
     * if (toolInfo.isSuccess) {
     *   // TypeScript knows output is defined here
     *   console.log(toolInfo.output.results);
     * }
     * ```
     */
    useToolInfo: <ToolName extends ToolNames>(): TypedToolInfoReturn<
      ToolInput<ServerType, ToolName>,
      ToolOutput<ServerType, ToolName>
    > => {
      return useToolInfo() as TypedToolInfoReturn<
        ToolInput<ServerType, ToolName>,
        ToolOutput<ServerType, ToolName>
      >;
    },
  };
}


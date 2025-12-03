import { useCallTool } from "./hooks/use-call-tool.js";
import type {
  McpServer,
  InferWidgets,
  AnyWidgetRegistry,
} from "../server/index.js";
import type { CallToolArgs, UnknownObject } from "./types.js";

type TypedCallToolReturn<
  TInput,
  TOutput
> = ReturnType<
  typeof useCallTool<
    TInput & CallToolArgs,
    { structuredContent: TOutput & UnknownObject }
  >
>;

/**
 * Creates typed versions of skybridge hooks with full type inference
 * for tool names, inputs, and outputs.
 *
 * This is the recommended way to use skybridge hooks in your widgets.
 * Set this up once in a dedicated file and export the typed hooks for use across your app.
 *
 * @typeParam T - The type of your McpServer instance. Use `typeof server`.
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
 * import { createTypedHooks } from "skybridge/web";
 *
 * export const { useCallTool } = createTypedHooks<AppType>();
 * ```
 *
 * @example
 * ```typescript
 * // web/src/widgets/search.tsx (usage)
 * import { useCallTool } from "../skybridge";
 *
 * export function SearchWidget() {
 *   const { callTool, data } = useCallTool("search-voyage");
 *   //                                      ^ autocomplete for tool names
 *   callTool({ query: "test" });
 *   //         ^ autocomplete for input fields
 * }
 * ```
 */
export function createTypedHooks<T extends McpServer<AnyWidgetRegistry>>() {
  type Widgets = InferWidgets<T>;
  type Names = keyof Widgets & string;

  // TODO: Add typed useToolInfo when it accepts a widget name parameter (breaking change)
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
    useCallTool: <K extends Names>(
      name: K
    ): TypedCallToolReturn<
      Widgets[K]["input"],
      Widgets[K]["output"]
    > => {
      // Type assertion is safe here because the runtime types are compatible.
      // The underlying hook accepts broader types, but we expose narrower, more specific types.
      return useCallTool<
        Widgets[K]["input"] & CallToolArgs,
        { structuredContent: Widgets[K]["output"] & UnknownObject }
      >(name) as unknown as TypedCallToolReturn<
        Widgets[K]["input"],
        Widgets[K]["output"]
      >;
    },
  };
}


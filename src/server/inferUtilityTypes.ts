import type { McpServer, ToolDef } from "./server.js";

/**
 * Any tool registry shape (includes both widgets and regular tools).
 * Used as a constraint for type parameters that accept tool registries.
 */
export type AnyToolRegistry = Record<string, ToolDef>;

/**
 * Extract the tool registry type from an McpServer instance.
 * This includes both widgets (registered via widget()) and regular tools (registered via registerTool()).
 *
 * @example
 * ```ts
 * type MyTools = InferTools<MyServer>;
 * // { "search": ToolDef<...>, "calculate": ToolDef<...> }
 * ```
 */
export type InferTools<T> = T extends McpServer<infer W> ? W : never;
type ExtractTool<T, K extends ToolNames<T>> = InferTools<T>[K];


/**
 * Get a union of all tool names from an McpServer instance.
 * This includes both widgets and regular tools.
 *
 * @example
 * ```ts
 * type Names = ToolNames<MyServer>;
 * // "search" | "calculate" | "details"
 * ```
 */
export type ToolNames<T> = keyof InferTools<T> & string;


/**
 * Get the input type for a specific tool (widget or regular tool).
 *
 * @example
 * ```ts
 * type SearchInput = ToolInput<MyServer, "search">;
 * ```
 */
export type ToolInput<T, K extends ToolNames<T>> = ExtractTool<T, K>["input"];

/**
 * Get the output type for a specific tool (widget or regular tool).
 *
 * @example
 * ```ts
 * type SearchOutput = ToolOutput<MyServer, "search">;
 * ```
 */
export type ToolOutput<T, K extends ToolNames<T>> = ExtractTool<T, K>["output"];



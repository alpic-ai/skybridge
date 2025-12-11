import type { McpServerTypes, ToolDef } from "./server.js";

/**
 * Any tool registry shape (includes both widgets and regular tools).
 * Used as a constraint for type parameters that accept tool registries.
 */
export type AnyToolRegistry = Record<string, ToolDef>;

/**
 * Extract the tool registry type from an McpServer instance.
 * This includes both widgets (registered via widget()) and regular tools (registered via registerTool()).
 *
 * Uses the `$types` property pattern for cross-package type inference.
 * This works across package boundaries because TypeScript uses structural typing
 * on the shape of `$types`, rather than nominal typing on the McpServer class itself.
 *
 * @example
 * ```ts
 * type MyTools = InferTools<MyServer>;
 * // { "search": ToolDef<...>, "calculate": ToolDef<...> }
 * ```
 */
export type InferTools<ServerType> = ServerType extends {
  $types: McpServerTypes<infer W>;
}
  ? W
  : never;
type ExtractTool<
  ServerType,
  K extends ToolNames<ServerType>,
> = InferTools<ServerType>[K];

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
export type ToolNames<ServerType> = keyof InferTools<ServerType> & string;

/**
 * Get the input type for a specific tool (widget or regular tool).
 *
 * @example
 * ```ts
 * type SearchInput = ToolInput<MyServer, "search">;
 * ```
 */
export type ToolInput<
  ServerType,
  ToolName extends ToolNames<ServerType>,
> = ExtractTool<ServerType, ToolName>["input"];

/**
 * Get the output type for a specific tool (widget or regular tool).
 *
 * @example
 * ```ts
 * type SearchOutput = ToolOutput<MyServer, "search">;
 * ```
 */
export type ToolOutput<
  ServerType,
  ToolName extends ToolNames<ServerType>,
> = ExtractTool<ServerType, ToolName>["output"];

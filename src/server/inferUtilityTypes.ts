import type { McpServer, WidgetDef } from "./server.js";

/**
 * Any widget registry shape.
 * Used as a constraint for type parameters that accept widget registries.
 */
export type AnyWidgetRegistry = Record<string, WidgetDef>;

/**
 * Extract the widget registry type from an McpServer instance.
 *
 * @example
 * ```ts
 * type MyWidgets = InferWidgets<MyServer>;
 * // { "search": WidgetDef<...>, "details": WidgetDef<...> }
 * ```
 */
export type InferWidgets<T> =
  T extends McpServer<infer W extends AnyWidgetRegistry>
    ? W
    : T extends McpServer<any>
      ? never // T is McpServer but registry couldn't be inferred
      : never;

/**
 * Get a union of all widget names from an McpServer instance.
 *
 * @example
 * ```ts
 * type Names = WidgetNames<MyServer>;
 * // "search" | "details" | "profile"
 * ```
 */
export type WidgetNames<T> = keyof InferWidgets<T> & string;

/**
 * Get the input type for a specific widget.
 *
 * @example
 * ```ts
 * type SearchInput = WidgetInput<MyServer, "search">;
 * ```
 */
export type WidgetInput<T, K extends WidgetNames<T>> =
  InferWidgets<T>[K]["input"];

/**
 * Get the output type for a specific widget.
 *
 * @example
 * ```ts
 * type SearchOutput = WidgetOutput<MyServer, "search">;
 * ```
 */
export type WidgetOutput<T, K extends WidgetNames<T>> =
  InferWidgets<T>[K]["output"];



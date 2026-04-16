import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  CallToolResult,
  CancelTaskResult,
  ClientNotification,
  ClientRequest,
  CompleteResult,
  EmptyResult,
  GetPromptResult,
  GetTaskPayloadResult,
  GetTaskResult,
  InitializeResult,
  ListPromptsResult,
  ListResourcesResult,
  ListResourceTemplatesResult,
  ListTasksResult,
  ListToolsResult,
  ReadResourceResult,
  ServerNotification,
  ServerRequest,
  ServerResult,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * The `extra` context object provided by the MCP SDK to request handlers.
 */
export type McpExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

/**
 * A single MCP middleware function following the onion model.
 * Call `next()` to invoke the next middleware or the final handler.
 * For notifications, `extra` is `undefined` (SDK does not provide extra context)
 * and `next()` resolves to `undefined`.
 */
export type McpMiddlewareFn = (
  request: { method: string; params: Record<string, unknown> },
  extra: McpExtra | undefined,
  next: () => Promise<unknown>,
) => Promise<unknown> | unknown;

/**
 * MCP methods the server handles (incoming from client).
 */
export type McpMethodString =
  | ClientRequest["method"]
  | ClientNotification["method"];

/** Extract params type for a specific MCP method from SDK unions. */
export type McpRequestParams<M extends string> =
  Extract<ClientRequest, { method: M }> extends { params: infer P }
    ? P
    : Extract<ClientNotification, { method: M }> extends { params: infer P }
      ? P
      : Record<string, unknown>;

/** Resolve extra type: McpExtra for requests, undefined for notifications. */
export type McpExtraFor<M extends string> = M extends ClientRequest["method"]
  ? McpExtra
  : M extends ClientNotification["method"]
    ? undefined
    : McpExtra | undefined;

/** Maps each MCP request method to its SDK result type. */
interface McpResultMap {
  ping: EmptyResult;
  initialize: InitializeResult;
  "tools/list": ListToolsResult;
  "tools/call": CallToolResult;
  "resources/list": ListResourcesResult;
  "resources/templates/list": ListResourceTemplatesResult;
  "resources/read": ReadResourceResult;
  "resources/subscribe": EmptyResult;
  "resources/unsubscribe": EmptyResult;
  "prompts/list": ListPromptsResult;
  "prompts/get": GetPromptResult;
  "completion/complete": CompleteResult;
  "logging/setLevel": EmptyResult;
  "tasks/get": GetTaskResult;
  "tasks/result": GetTaskPayloadResult;
  "tasks/list": ListTasksResult;
  "tasks/cancel": CancelTaskResult;
}

/**
 * Map an MCP method string to its corresponding result type.
 * For request methods, resolves to the specific SDK result type.
 * For wildcard patterns (e.g. `"tools/*"`), resolves to the union of matching result types.
 * For notification methods, resolves to `undefined`.
 * For unknown/unmatched methods, falls back to `ServerResult`.
 */
export type McpResultFor<M extends string> = M extends keyof McpResultMap
  ? McpResultMap[M]
  : M extends `${infer Prefix}/*`
    ? [McpResultMap[keyof McpResultMap & `${Prefix}/${string}`]] extends [never]
      ? M extends ToWildcard<ClientNotification["method"]>
        ? undefined
        : ServerResult
      : McpResultMap[keyof McpResultMap & `${Prefix}/${string}`]
    : M extends ClientNotification["method"]
      ? undefined
      : ServerResult;

/** Typed middleware fn for a specific method — narrows params, extra, and next() result. */
export type McpTypedMiddlewareFn<M extends string> = (
  request: { method: M; params: McpRequestParams<M> },
  extra: McpExtraFor<M>,
  next: () => Promise<McpResultFor<M>>,
) => Promise<unknown> | unknown;

/** Extracts `"prefix/*"` from `"prefix/anything"` — distributive over unions. */
type ToWildcard<T extends string> = T extends `${infer Prefix}/${string}`
  ? `${Prefix}/*`
  : never;

/** Wildcard prefixes derived from method strings (e.g. `"tools/*"` from `"tools/call"`). */
export type McpWildcard = ToWildcard<McpMethodString>;

/** Category keywords matching all requests or all notifications. */
type McpCategory = "request" | "notification";

/**
 * A single filter pattern for MCP middleware:
 * - Exact method: `"tools/call"`
 * - Wildcard: `"tools/*"`
 * - Category: `"request"` | `"notification"`
 * - Escape hatch: arbitrary string via `string & {}`
 */
type McpMiddlewareFilterPattern =
  | McpMethodString
  | McpWildcard
  | McpCategory
  | (string & {});

/**
 * Filter determining which MCP methods a middleware applies to.
 * A single pattern or an array of patterns (OR logic).
 */
export type McpMiddlewareFilter =
  | McpMiddlewareFilterPattern
  | McpMiddlewareFilterPattern[];

/**
 * Internal entry stored for each registered middleware.
 * `filter: null` means catch-all (matches everything).
 */
export type McpMiddlewareEntry = {
  filter: McpMiddlewareFilter | null;
  handler: McpMiddlewareFn;
};

type HandlerMap = Map<string, (...args: unknown[]) => Promise<unknown>>;

/**
 * Extract the TS-private `_requestHandlers` and `_notificationHandlers` maps
 * from the SDK's `Server` (extends `Protocol`). These are runtime-accessible
 * but declared `private` in TypeScript.
 *
 * Validates with `instanceof Map` so an incompatible SDK version fails fast
 * instead of silently breaking.
 */
export function getHandlerMaps(server: Server) {
  const obj: object = server;

  if (
    !("_requestHandlers" in obj && obj._requestHandlers instanceof Map) ||
    !(
      "_notificationHandlers" in obj && obj._notificationHandlers instanceof Map
    )
  ) {
    throw new Error(
      "Incompatible MCP SDK version: expected _requestHandlers and _notificationHandlers on Server",
    );
  }

  return {
    requestHandlers: obj._requestHandlers as HandlerMap,
    notificationHandlers: obj._notificationHandlers as HandlerMap,
  };
}

/**
 * Check if a single filter pattern matches a given method.
 *
 * - Exact: `"tools/call"` matches only `"tools/call"`
 * - Wildcard: `"tools/*"` matches any method starting with `"tools/"`
 * - Category `"request"`: matches when `isNotification` is false
 * - Category `"notification"`: matches when `isNotification` is true
 */
export function matchesFilter(
  method: string,
  filter: string,
  isNotification: boolean,
): boolean {
  if (filter === "request") {
    return !isNotification;
  }
  if (filter === "notification") {
    return isNotification;
  }
  if (filter.endsWith("/*")) {
    const prefix = filter.slice(0, -1); // "tools/*" → "tools/"
    return method.startsWith(prefix);
  }
  return method === filter;
}

function matchesAnyFilter(
  method: string,
  filter: McpMiddlewareFilter | null,
  isNotification: boolean,
): boolean {
  if (filter === null) {
    return true;
  }
  if (typeof filter === "string") {
    return matchesFilter(method, filter, isNotification);
  }
  return filter.some((pattern) =>
    matchesFilter(method, pattern, isNotification),
  );
}

/**
 * Build an onion-model middleware chain for a specific method.
 *
 * Filters `entries` to those matching `method`, then composes them
 * so the first registered middleware is the outermost layer.
 * `next()` is guarded against multiple calls within a single middleware.
 */
export function buildMiddlewareChain(
  method: string,
  isNotification: boolean,
  originalHandler: (...args: unknown[]) => Promise<unknown>,
  entries: McpMiddlewareEntry[],
) {
  const applicable = entries.filter((entry) =>
    matchesAnyFilter(method, entry.filter, isNotification),
  );

  if (applicable.length === 0) {
    return originalHandler;
  }

  return (...args: unknown[]) => {
    const rawRequest = args[0] as Record<string, unknown> | undefined;
    // SDK calls request handlers as handler(request, extra) but
    // notification handlers as handler(notification) — no extra arg.
    const extra = isNotification ? undefined : (args[1] as McpExtra);
    const mcpRequest = {
      method,
      params: (rawRequest?.params as Record<string, unknown>) ?? {},
    };

    let index = 0;

    const executeLayer = (): Promise<unknown> => {
      const entry = applicable[index++];
      if (!entry) {
        if (rawRequest) {
          rawRequest.params = mcpRequest.params;
        }
        return originalHandler(...args);
      }

      let nextCalled = false;

      const next = (): Promise<unknown> => {
        if (nextCalled) {
          throw new Error(
            `next() called multiple times in middleware for "${method}"`,
          );
        }
        nextCalled = true;
        return executeLayer();
      };

      return Promise.resolve(entry.handler(mcpRequest, extra, next));
    };

    return executeLayer();
  };
}

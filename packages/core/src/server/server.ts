import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import type {
  McpUiResourceMeta,
  McpUiToolMeta,
} from "@modelcontextprotocol/ext-apps";
import { McpServer as McpServerBase } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  AnySchema,
  SchemaOutput,
  ZodRawShapeCompat,
} from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ContentBlock,
  ServerNotification,
  ServerRequest,
  ServerResult,
  ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import { mergeWith, union } from "es-toolkit";
import type { ErrorRequestHandler, Express, RequestHandler } from "express";
import { createApp } from "./express.js";
import { createMiddlewareEntry } from "./metric.js";
import type {
  McpExtra,
  McpExtraFor,
  McpMethodString,
  McpMiddlewareEntry,
  McpMiddlewareFilter,
  McpMiddlewareFn,
  McpResultFor,
  McpTypedMiddlewareFn,
  McpWildcard,
} from "./middleware.js";
import { buildMiddlewareChain, getHandlerMaps } from "./middleware.js";
import { templateHelper } from "./templateHelper.js";

const mergeWithUnion = <T extends object, S extends object>(
  target: T,
  source: S,
): T & S => {
  return mergeWith(target, source, (targetVal, sourceVal) => {
    if (Array.isArray(targetVal) && Array.isArray(sourceVal)) {
      return union(targetVal, sourceVal);
    }
  });
};

export type ToolDef<
  TInput = unknown,
  TOutput = unknown,
  TResponseMetadata = unknown,
> = {
  input: TInput;
  output: TOutput;
  responseMetadata: TResponseMetadata;
};

export type ViewHostType = "apps-sdk" | "mcp-app";

export interface ViewCsp {
  /** Origins for static assets (images, fonts, scripts, styles). */
  resourceDomains?: string[];
  /** Origins the view may contact via fetch/XHR. */
  connectDomains?: string[];
  /** Origins allowed for iframe embeds (opts into stricter app review). */
  frameDomains?: string[];
  /** Origins that can receive openExternal redirects without the safe-link modal. */
  redirectDomains?: string[];
  /** Origins allowed in `<base href>` tags (mcp-apps only). */
  baseUriDomains?: string[];
}

// Must be exported: TS module augmentation only merges with exported
// declarations. Without `export`, `.skybridge/views.d.ts` augmentation
// would create a separate interface and `ViewName` would stay `string`.
// biome-ignore lint/suspicious/noEmptyInterface: register pattern — augmented by `.skybridge/views.d.ts` to narrow ViewName
export interface ViewNameRegistry {}

export type ViewName = keyof ViewNameRegistry extends never
  ? string
  : keyof ViewNameRegistry & string;

export interface ViewConfig {
  component: ViewName;
  description?: string;
  hosts?: ViewHostType[];
  prefersBorder?: boolean;
  domain?: string;
  csp?: ViewCsp;
  _meta?: Record<string, unknown>;
}

export interface KnownToolMeta {
  "openai/widgetAccessible"?: boolean;
  "openai/toolInvocation/invoking"?: string;
  "openai/toolInvocation/invoked"?: string;
}

export type ToolMeta = KnownToolMeta & Record<string, unknown>;

export type HandlerContent = string | ContentBlock | ContentBlock[];

/** @see https://developers.openai.com/apps-sdk/reference#tool-descriptor-parameters */
type ViteManifestEntry = {
  file: string;
  name?: string;
  src?: string;
  isEntry?: boolean;
  isDynamicEntry?: boolean;
  css?: string[];
  assets?: string[];
  imports?: string[];
  dynamicImports?: string[];
};

type OpenaiToolMeta = {
  "openai/outputTemplate": string;
  "openai/widgetAccessible"?: boolean;
  "openai/toolInvocation/invoking"?: string;
  "openai/toolInvocation/invoked"?: string;
};

/** @see https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx#resource-discovery */
type McpAppsToolMeta = {
  ui: McpUiToolMeta;
};

type InternalToolMeta = Partial<OpenaiToolMeta & McpAppsToolMeta>;

/** @see https://developers.openai.com/apps-sdk/reference#component-resource-_meta-fields */
type OpenaiWidgetCSP = {
  connect_domains: string[];
  resource_domains: string[];
  frame_domains?: string[];
  redirect_domains?: string[];
};

type OpenaiResourceMeta = {
  "openai/widgetDescription"?: string;
  "openai/widgetPrefersBorder"?: boolean;
  "openai/widgetCSP"?: OpenaiWidgetCSP;
  "openai/widgetDomain"?: string;
};

/**
 * MCP Apps CSP extended with upcoming / Skybridge-specific fields.
 * @see https://github.com/modelcontextprotocol/ext-apps/pull/158
 */
type ExtendedMcpUiResourceCsp = McpUiResourceMeta["csp"] & {
  /**
   * Origins that can receive openExternal redirects without the safe-link modal.
   * OpenAI-specific; mirrored into the mcp-apps CSP for cross-host parity.
   * @see https://developers.openai.com/apps-sdk/reference#component-resource-_meta-fields
   */
  redirectDomains?: string[];
};

type ExtendedMcpUiResourceMeta = Omit<McpUiResourceMeta, "csp"> & {
  csp?: ExtendedMcpUiResourceCsp;
};

type McpAppsResourceMeta = {
  ui?: ExtendedMcpUiResourceMeta;
};

type ResourceMeta = OpenaiResourceMeta | McpAppsResourceMeta;

type ViewResourceConfig<T extends ResourceMeta = ResourceMeta> = {
  hostType: ViewHostType;
  uri: string;
  mimeType: string;
  buildContentMeta: (
    defaults: {
      resourceDomains: string[];
      connectDomains: string[];
      domain: string;
      baseUriDomains: string[];
    },
    overrides: { domain?: string },
  ) => T;
};

/**
 * Type-level marker interface for cross-package type inference.
 *
 * Consumers infer tool types via the structural `$types` property rather than
 * the `McpServer` class generic, because class-generic inference breaks when
 * `McpServer` comes from different package installations (e.g. a consumer
 * with its own `skybridge` dep vs. the in-tree workspace version).
 *
 * Inspired by tRPC's `_def` pattern and Hono's type markers.
 */
export interface McpServerTypes<TTools extends Record<string, ToolDef>> {
  readonly tools: TTools;
}

type Simplify<T> = { [K in keyof T]: T[K] };

type ShapeOutput<Shape extends ZodRawShapeCompat> = Simplify<
  {
    [K in keyof Shape as undefined extends SchemaOutput<Shape[K]>
      ? never
      : K]: SchemaOutput<Shape[K]>;
  } & {
    [K in keyof Shape as undefined extends SchemaOutput<Shape[K]>
      ? K
      : never]?: SchemaOutput<Shape[K]>;
  }
>;

type ExtractStructuredContent<T> = T extends { structuredContent: infer SC }
  ? Simplify<SC>
  : never;

type ExtractMeta<T> = [Extract<T, { _meta: unknown }>] extends [never]
  ? unknown
  : Extract<T, { _meta: unknown }> extends { _meta: infer M }
    ? Simplify<M>
    : unknown;

type AddTool<
  TTools,
  TName extends string,
  TInput extends ZodRawShapeCompat,
  TOutput,
  TResponseMetadata = unknown,
> = McpServer<
  TTools & {
    [K in TName]: ToolDef<ShapeOutput<TInput>, TOutput, TResponseMetadata>;
  }
>;

interface UnifiedToolConfig<TInput extends ZodRawShapeCompat | AnySchema> {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: TInput;
  outputSchema?: ZodRawShapeCompat | AnySchema;
  annotations?: ToolAnnotations;
  view?: ViewConfig;
  _meta?: ToolMeta;
}

type ToolHandler<
  TInput extends ZodRawShapeCompat,
  TReturn extends { content?: HandlerContent } = { content?: HandlerContent },
> = (
  args: ShapeOutput<TInput>,
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
) => TReturn | Promise<TReturn>;

type MiddlewareConfig = {
  path?: string;
  handlers: RequestHandler[];
};

type ErrorMiddlewareConfig = {
  path?: string;
  handlers: ErrorRequestHandler[];
};

export function normalizeContent(
  content: HandlerContent | undefined,
): ContentBlock[] {
  if (content === undefined) {
    return [];
  }
  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }
  if (Array.isArray(content)) {
    return content;
  }
  return [content];
}

// We Omit `registerTool` from the base class at the type level so our
// unified 2-arg signature can replace the SDK's 3-arg one without an
// incompatible override.  The runtime prototype chain is unaffected.
interface McpServerBaseOmitted
  extends Omit<McpServerBase, "registerTool" | "connect"> {}
const McpServerBaseOmitted = McpServerBase as unknown as new (
  ...args: ConstructorParameters<typeof McpServerBase>
) => McpServerBaseOmitted;

export class McpServer<
  TTools extends Record<string, ToolDef> = Record<never, ToolDef>,
> extends McpServerBaseOmitted {
  declare readonly $types: McpServerTypes<TTools>;
  private express?: Express;
  private customMiddleware: MiddlewareConfig[] = [];
  private customErrorMiddleware: ErrorMiddlewareConfig[] = [];
  private mcpMiddlewareEntries: McpMiddlewareEntry[] = [];
  private mcpMiddlewareApplied = false;
  private claimedViews = new Map<string, string>();

  use(...handlers: RequestHandler[]): this;
  use(path: string, ...handlers: RequestHandler[]): this;
  use(
    pathOrHandler: string | RequestHandler,
    ...handlers: RequestHandler[]
  ): this {
    if (typeof pathOrHandler === "string") {
      this.customMiddleware.push({
        path: pathOrHandler,
        handlers,
      });
    } else {
      this.customMiddleware.push({
        handlers: [pathOrHandler, ...handlers],
      });
    }

    return this;
  }

  useOnError(...handlers: ErrorRequestHandler[]): this;
  useOnError(path: string, ...handlers: ErrorRequestHandler[]): this;
  useOnError(
    pathOrHandler: string | ErrorRequestHandler,
    ...handlers: ErrorRequestHandler[]
  ): this {
    if (typeof pathOrHandler === "string") {
      this.customErrorMiddleware.push({ path: pathOrHandler, handlers });
    } else {
      this.customErrorMiddleware.push({
        handlers: [pathOrHandler, ...handlers],
      });
    }
    return this;
  }

  /** Register MCP protocol-level middleware (catch-all). */
  mcpMiddleware(handler: McpMiddlewareFn): this;
  /** Register MCP protocol-level middleware for all requests (`extra` is `McpExtra`). */
  mcpMiddleware(
    filter: "request",
    handler: (
      request: { method: string; params: Record<string, unknown> },
      extra: McpExtra,
      next: () => Promise<ServerResult>,
    ) => Promise<unknown> | unknown,
  ): this;
  /** Register MCP protocol-level middleware for all notifications (`extra` is `undefined`). */
  mcpMiddleware(
    filter: "notification",
    handler: (
      request: { method: string; params: Record<string, unknown> },
      extra: undefined,
      next: () => Promise<undefined>,
    ) => Promise<unknown> | unknown,
  ): this;
  /**
   * Register MCP protocol-level middleware for an exact method.
   * Narrows `params`, `extra`, and `next()` result based on the method string.
   */
  mcpMiddleware<M extends McpMethodString>(
    filter: M,
    handler: McpTypedMiddlewareFn<M>,
  ): this;
  /**
   * Register MCP protocol-level middleware for a wildcard pattern (e.g. `"tools/*"`).
   * `next()` returns the union of result types for matching methods.
   */
  mcpMiddleware<W extends McpWildcard>(
    filter: W,
    handler: (
      request: { method: string; params: Record<string, unknown> },
      extra: McpExtraFor<W>,
      next: () => Promise<McpResultFor<W>>,
    ) => Promise<unknown> | unknown,
  ): this;
  /**
   * Register MCP protocol-level middleware with a method filter.
   * Filter can be an exact method (`"tools/call"`), wildcard (`"tools/*"`),
   * category (`"request"` | `"notification"`), or an array of those.
   */
  mcpMiddleware(filter: McpMiddlewareFilter, handler: McpMiddlewareFn): this;
  mcpMiddleware(
    filterOrHandler: McpMiddlewareFilter | McpMiddlewareFn,
    // biome-ignore lint/suspicious/noExplicitAny: overloads narrow the handler type at call sites; implementation must accept all variants
    maybeHandler?: any,
  ): this {
    if (this.mcpMiddlewareApplied) {
      throw new Error(
        "Cannot register MCP middleware after run() or connect() has been called",
      );
    }

    const handler = maybeHandler as McpMiddlewareFn | undefined;

    if (typeof filterOrHandler === "function") {
      this.mcpMiddlewareEntries.push({
        filter: null,
        handler: filterOrHandler,
      });
    } else if (handler) {
      this.mcpMiddlewareEntries.push({
        filter: filterOrHandler,
        handler,
      });
    } else {
      throw new Error(
        "mcpMiddleware requires a handler function when a filter is provided",
      );
    }

    return this;
  }

  private applyMcpMiddleware(): void {
    if (this.mcpMiddlewareApplied) {
      return;
    }
    this.mcpMiddlewareApplied = true;

    const monitoringEntry = createMiddlewareEntry();
    const entries = monitoringEntry
      ? [monitoringEntry, ...this.mcpMiddlewareEntries]
      : this.mcpMiddlewareEntries;

    if (entries.length === 0) {
      return;
    }

    const { requestHandlers, notificationHandlers } = getHandlerMaps(
      this.server,
    );

    const instrumentMap = (
      map: Map<string, (...args: unknown[]) => Promise<unknown>>,
      isNotification: boolean,
    ) => {
      for (const [method, handler] of map) {
        map.set(
          method,
          buildMiddlewareChain(method, isNotification, handler, entries),
        );
      }
      const originalSet = map.set.bind(map);
      map.set = (
        method: string,
        handler: (...args: unknown[]) => Promise<unknown>,
      ) =>
        originalSet(
          method,
          buildMiddlewareChain(method, isNotification, handler, entries),
        );
    };

    instrumentMap(requestHandlers, false);
    instrumentMap(notificationHandlers, true);
  }

  async connect(
    transport: Parameters<typeof McpServerBase.prototype.connect>[0],
  ): Promise<void> {
    this.applyMcpMiddleware();
    return McpServerBase.prototype.connect.call(this, transport);
  }

  async run(): Promise<void> {
    this.applyMcpMiddleware();
    const httpServer = http.createServer();

    if (!this.express) {
      this.express = await createApp({
        mcpServer: this,
        httpServer,
        customMiddleware: this.customMiddleware,
        errorMiddleware: this.customErrorMiddleware,
      });
    }

    httpServer.on("request", this.express);
    return new Promise((resolve, reject) => {
      httpServer.on("error", (error: Error) => {
        console.error("Failed to start server:", error);
        reject(error);
      });
      const port = parseInt(process.env.__PORT ?? "3000", 10);
      httpServer.listen(port, () => {
        resolve();
      });
    });
  }

  private enforceOneToolPerView(component: string, toolName: string): void {
    const existingTool = this.claimedViews.get(component);
    if (existingTool) {
      throw new Error(
        `skybridge: view "${component}" is already used by tool "${existingTool}". Tool "${toolName}" cannot also reference it — each view backs exactly one tool.`,
      );
    }
    this.claimedViews.set(component, toolName);
  }

  private registerViewResources(
    toolName: string,
    view: ViewConfig,
    toolMeta: InternalToolMeta,
  ): void {
    const hosts = view.hosts ?? (["apps-sdk", "mcp-app"] as const);

    if (hosts.includes("apps-sdk")) {
      const viewResource: ViewResourceConfig<OpenaiResourceMeta> = {
        hostType: "apps-sdk",
        uri: `ui://widgets/apps-sdk/${view.component}.html`,
        mimeType: "text/html+skybridge",
        buildContentMeta: (
          { resourceDomains, connectDomains, domain },
          overrides,
        ) => {
          const defaults: OpenaiResourceMeta = {
            "openai/widgetCSP": {
              resource_domains: resourceDomains,
              connect_domains: connectDomains,
            },
            "openai/widgetDomain": domain,
            "openai/widgetDescription": view.description,
          };

          const fromView: Partial<
            Omit<
              OpenaiResourceMeta,
              "openai/widgetCSP" | "openai/widgetDescription"
            > & {
              "openai/widgetCSP": Partial<OpenaiWidgetCSP>;
            }
          > = {
            "openai/widgetCSP": {
              resource_domains: view.csp?.resourceDomains,
              connect_domains: view.csp?.connectDomains,
              frame_domains: view.csp?.frameDomains,
              redirect_domains: view.csp?.redirectDomains,
            },
            "openai/widgetDomain": view.domain,
            "openai/widgetPrefersBorder": view.prefersBorder,
          };

          const base = mergeWithUnion(mergeWithUnion(defaults, fromView), {
            "openai/widgetDomain": overrides.domain,
          });

          if (view._meta) {
            return { ...base, ...view._meta } as OpenaiResourceMeta;
          }
          return base;
        },
      };
      this.registerViewResource({
        name: toolName,
        viewResource,
        view,
      });
      toolMeta["openai/outputTemplate"] = viewResource.uri;
    }

    if (hosts.includes("mcp-app")) {
      const viewResource: ViewResourceConfig<McpAppsResourceMeta> = {
        hostType: "mcp-app",
        uri: `ui://widgets/ext-apps/${view.component}.html`,
        mimeType: "text/html;profile=mcp-app",
        buildContentMeta: (
          { resourceDomains, connectDomains, domain, baseUriDomains },
          overrides,
        ) => {
          const defaults: McpAppsResourceMeta = {
            ui: {
              csp: {
                resourceDomains,
                connectDomains,
                baseUriDomains,
              },
              domain,
            },
          };

          const fromView: McpAppsResourceMeta = {
            ui: {
              ...(view.description && { description: view.description }),
              ...(view.prefersBorder !== undefined && {
                prefersBorder: view.prefersBorder,
              }),
              ...(view.domain && { domain: view.domain }),
              csp: {
                ...(view.csp?.resourceDomains && {
                  resourceDomains: view.csp.resourceDomains,
                }),
                ...(view.csp?.connectDomains && {
                  connectDomains: view.csp.connectDomains,
                }),
                ...(view.csp?.frameDomains && {
                  frameDomains: view.csp.frameDomains,
                }),
                ...(view.csp?.baseUriDomains && {
                  baseUriDomains: view.csp.baseUriDomains,
                }),
                ...(view.csp?.redirectDomains && {
                  redirectDomains: view.csp.redirectDomains,
                }),
              },
            },
          };

          const base = mergeWithUnion(mergeWithUnion(defaults, fromView), {
            ui: overrides,
          });

          if (view._meta) {
            return { ...base, ...view._meta } as McpAppsResourceMeta;
          }
          return base;
        },
      };
      this.registerViewResource({
        name: toolName,
        viewResource,
        view,
      });
      // @ts-expect-error - For backwards compatibility with Claude current implementation of the specs
      toolMeta["ui/resourceUri"] = viewResource.uri;
      toolMeta.ui = { resourceUri: viewResource.uri };
    }
  }

  private registerViewResource({
    name,
    viewResource,
    view,
  }: {
    name: string;
    viewResource: ViewResourceConfig;
    view: ViewConfig;
  }): void {
    const { hostType, uri: viewUri, mimeType, buildContentMeta } = viewResource;

    this.registerResource(
      name,
      viewUri,
      { description: view.description },
      async (uri, extra) => {
        const isProduction = process.env.NODE_ENV === "production";
        const isClaude =
          extra?.requestInfo?.headers?.["user-agent"] === "Claude-User";

        const headers = extra?.requestInfo?.headers || {};
        const header = (key: string) => {
          const val = headers[key];
          return Array.isArray(val) ? val[0] : val;
        };

        let serverUrl: string;

        const forwardedHost = header("x-forwarded-host");
        const origin = header("origin");
        const host = header("host");

        if (forwardedHost) {
          const proto = header("x-forwarded-proto") || "https";
          serverUrl = `${proto}://${forwardedHost}`;
        } else if (origin) {
          serverUrl = origin;
        } else if (host) {
          const proto = ["127.0.0.1:", "localhost:"].some((p) =>
            host.startsWith(p),
          )
            ? "http"
            : "https";
          serverUrl = `${proto}://${host}`;
        } else {
          const devPort = process.env.__PORT || "3000";
          serverUrl = `http://localhost:${devPort}`;
        }

        const html = isProduction
          ? templateHelper.renderProduction({
              hostType,
              serverUrl,
              viewFile: this.lookupViewFile(view.component),
              styleFile: this.lookupDistFile("style.css") ?? "",
            })
          : templateHelper.renderDevelopment({
              hostType,
              serverUrl,
              viewName: view.component,
            });

        const connectDomains = [serverUrl];
        if (!isProduction) {
          const wsUrl = new URL(serverUrl);
          wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
          connectDomains.push(wsUrl.origin);
        }

        let contentMetaOverrides: { domain?: string } = {};
        if (isClaude) {
          const pathname = extra?.requestInfo?.url?.pathname ?? "";
          const rawUrl =
            header("x-alpic-forwarded-url") ?? `${serverUrl}${pathname}`;
          // Strip a lone trailing slash so the hash matches the connector URL
          // as registered with Claude (which has no trailing slash on bare origins).
          const url = rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
          const hash = crypto
            .createHash("sha256")
            .update(url)
            .digest("hex")
            .slice(0, 32);
          contentMetaOverrides = { domain: `${hash}.claudemcpcontent.com` };
        }

        const contentMeta = buildContentMeta(
          {
            resourceDomains: [serverUrl],
            connectDomains,
            domain: serverUrl,
            baseUriDomains: [serverUrl],
          },
          contentMetaOverrides,
        );

        return {
          contents: [
            { uri: uri.href, mimeType, text: html, _meta: contentMeta },
          ],
        };
      },
    );
  }

  private wrapHandler<InputArgs extends ZodRawShapeCompat>(
    cb: ToolHandler<InputArgs>,
    { attachViewUUID }: { attachViewUUID: boolean },
  ): ToolHandler<InputArgs> {
    return async (args, extra) => {
      const result = await cb(args, extra);
      return {
        ...result,
        content: normalizeContent(result.content),
        ...(attachViewUUID && {
          _meta: {
            ...(result as { _meta?: Record<string, unknown> })._meta,
            viewUUID: crypto.randomUUID(),
          },
        }),
      };
    };
  }

  private lookupViewFile(viewName: string) {
    const manifest = this.readManifest();
    for (const entry of Object.values(manifest)) {
      if (entry?.isEntry && entry.name === viewName && entry.file) {
        return entry.file;
      }
    }
    throw new Error(
      `View "${viewName}" not found in Vite manifest. Did the build complete successfully? Look for an entry with name "${viewName}" in dist/assets/.vite/manifest.json.`,
    );
  }

  private lookupDistFile(key: string) {
    const manifest = this.readManifest();
    return manifest[key]?.file;
  }

  private readManifest(): Record<string, ViteManifestEntry> {
    return JSON.parse(
      readFileSync(
        path.join(process.cwd(), "dist", "assets", ".vite", "manifest.json"),
        "utf-8",
      ),
    );
  }

  registerTool<
    TName extends string,
    InputArgs extends ZodRawShapeCompat,
    TReturn extends { content?: HandlerContent },
  >(
    config: UnifiedToolConfig<InputArgs> & { name: TName },
    cb: ToolHandler<InputArgs, TReturn>,
  ): AddTool<
    TTools,
    TName,
    InputArgs,
    ExtractStructuredContent<TReturn>,
    ExtractMeta<TReturn>
  >;
  registerTool<InputArgs extends ZodRawShapeCompat>(
    config: UnifiedToolConfig<InputArgs>,
    cb: ToolHandler<InputArgs>,
  ): this;
  registerTool(...args: unknown[]): unknown {
    const baseFn = McpServerBase.prototype.registerTool as (
      ...args: unknown[]
    ) => unknown;

    if (typeof args[0] === "string") {
      baseFn.call(this, args[0], args[1], args[2]);
      return this;
    }

    const config = args[0] as UnifiedToolConfig<ZodRawShapeCompat>;
    const cb = args[1] as ToolHandler<ZodRawShapeCompat>;

    const { name, view, _meta: userToolMeta, ...toolFields } = config;

    const toolMeta: InternalToolMeta = { ...userToolMeta };

    if (view) {
      this.enforceOneToolPerView(view.component, name);
      this.registerViewResources(name, view, toolMeta);
    }

    const wrappedCb = this.wrapHandler(cb, { attachViewUUID: Boolean(view) });

    baseFn.call(this, name, { ...toolFields, _meta: toolMeta }, wrappedCb);

    return this;
  }
}

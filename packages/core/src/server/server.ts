import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import type {
  McpUiResourceMeta,
  McpUiToolMeta,
} from "@modelcontextprotocol/ext-apps";
import {
  Server as SdkServer,
  type ServerOptions,
} from "@modelcontextprotocol/sdk/server/index.js";
import { McpServer as McpServerBase } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  AnySchema,
  SchemaOutput,
  ZodRawShapeCompat,
} from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ContentBlock,
  Implementation,
  RequestMeta,
  ServerNotification,
  ServerRequest,
  ServerResult,
  ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import { mergeWith, union } from "es-toolkit";
import express, {
  type ErrorRequestHandler,
  type Express,
  type RequestHandler,
} from "express";
import type { OAuthConfig } from "./auth/index.js";
import {
  authToSecuritySchemes,
  evaluateSecuritySchemes,
  wwwAuthenticateHeader,
} from "./auth/security-schemes.js";
import { type ResourceMetadataUrlResolver, setupOAuth } from "./auth/setup.js";
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
import { resolveServerOrigin } from "./requestOrigin.js";
import {
  discoverSkills,
  registerSkills,
  SKILLS_EXTENSION_KEY,
  type SkillsManifest,
} from "./skills.js";
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

/**
 * Type marker for a registered tool — carries its input, output, and response
 * metadata shapes so views can infer types from `typeof server`.
 *
 * You normally never construct this by hand; it is produced by `registerTool`
 * and consumed by helpers like {@link InferTools} and {@link generateHelpers}.
 */
export type ToolDef<
  TInput = unknown,
  TOutput = unknown,
  TResponseMetadata = unknown,
> = {
  input: TInput;
  output: TOutput;
  responseMetadata: TResponseMetadata;
};

/**
 * @deprecated Views now always emit a single ext-apps resource; host targeting
 * no longer applies. Retained for backwards compatibility; will be removed in a
 * future major.
 */
export type ViewHostType = "apps-sdk" | "mcp-app";

/**
 * Content Security Policy origins attached to a view's resource. Each list is
 * passed through to the host's CSP for the view iframe; omit a field to inherit
 * the host's default for that directive.
 */
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

/**
 * Registry of view component names. The Skybridge Vite plugin augments this
 * interface in the generated `.skybridge/views.d.ts` with one key per view
 * file, which narrows {@link ViewName} from `string` to the concrete union.
 */
// Must be exported: TS module augmentation only merges with exported
// declarations. Without `export`, `.skybridge/views.d.ts` augmentation
// would create a separate interface and `ViewName` would stay `string`.
// biome-ignore lint/suspicious/noEmptyInterface: register pattern — augmented by `.skybridge/views.d.ts` to narrow ViewName
export interface ViewNameRegistry {}

/**
 * Resolve view component names from a registry: the union of its keys, or
 * `string` when the registry is empty. The empty case happens before
 * `.skybridge/views.d.ts` is generated; falling back to `string` keeps valid
 * view names from erroring on a fresh checkout, and narrowing kicks in once
 * the generated file augments the registry.
 */
export type ViewNameFor<Registry> = [keyof Registry & string] extends [never]
  ? string
  : keyof Registry & string;

/** Union of valid view component names. Narrowed by {@link ViewNameRegistry}. */
export type ViewName = ViewNameFor<ViewNameRegistry>;

/**
 * Pass under `view` in a tool's `registerTool` config to render the tool's
 * result through a Skybridge view instead of a plain text response.
 */
export interface ViewConfig {
  /** Filename of the view module (without extension) — matches a file in your `viewsDir`. */
  component: ViewName;
  /** Human-readable label the host may show alongside the view. */
  description?: string;
  /**
   * @deprecated No-op. Every view emits a single ext-apps resource regardless
   * of this value. Will be removed in a future major.
   */
  hosts?: ViewHostType[];
  /** Request a visible border around the view (forwarded as `ui.prefersBorder`). */
  prefersBorder?: boolean;
  /** Override the iframe's served domain (advanced; forwarded as `ui.domain`). */
  domain?: string;
  /** Per-view CSP overrides — see {@link ViewCsp}. */
  csp?: ViewCsp;
  /** Free-form metadata forwarded on the view resource's `_meta`. */
  _meta?: Record<string, unknown>;
}

export type SecurityScheme =
  | { type: "noauth" }
  | { type: "oauth2"; scopes?: string[] };

export type ToolAuth = "public" | "required" | { scopes: string[] };

/**
 * Options forwarded to the built-in `express.json()` body parser. Derived
 * from Express's own types so the public API doesn't depend on `body-parser`.
 */
export type JsonOptions = NonNullable<Parameters<typeof express.json>[0]>;

/** Skybridge-specific server options, passed as the third `McpServer` constructor argument. */
export interface SkybridgeServerOptions {
  /** Options for the built-in `express.json()` middleware, e.g. `{ limit: "10mb" }`. */
  json?: JsonOptions;
  /** Resource-server OAuth config. When set, mounts well-known metadata and bearer auth on `/mcp`. */
  oauth?: OAuthConfig;
  /**
   * @experimental Serve Agent Skills from `src/skills` over MCP (SEP-2640).
   * API may change.
   */
  skills?: boolean;
}

const SKILLS_DIR = "src/skills";

/**
 * Normalize an `x-forwarded-prefix` value into a leading-slash, no-trailing-slash
 * path. Takes the first hop of a comma-separated proxy chain.
 * "/v1/", "v1", "/v1, /internal" → "/v1"; "", "/", undefined → "".
 */
function normalizeForwardedPrefix(raw: string | undefined): string {
  const firstHop = raw?.split(",")[0]?.trim() ?? "";
  const trimmed = firstHop.replace(/\/+$/, "");
  if (trimmed === "") {
    return "";
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/**
 * Well-known keys recognized by host runtimes when set on a tool's `_meta`.
 * Use {@link ToolMeta} to also pass arbitrary custom metadata alongside these.
 *
 * @see https://developers.openai.com/apps-sdk/reference#tool-descriptor-parameters
 */
export interface KnownToolMeta {
  /** Apps SDK: allow the rendered view to call this tool from inside its iframe. */
  "openai/widgetAccessible"?: boolean;
  /** Apps SDK: status text shown while the tool is running (e.g. `"Searching trips"`). */
  "openai/toolInvocation/invoking"?: string;
  /** Apps SDK: status text shown once the tool returns (e.g. `"Found 3 trips"`). */
  "openai/toolInvocation/invoked"?: string;
  /** Apps SDK: input parameters that hold file references — the host attaches uploaded files to them. */
  "openai/fileParams"?: string[];
  /** MCP Apps: control whether the tool is exposed to the model, the app, or both. */
  ui?: Pick<McpUiToolMeta, "visibility">;
  securitySchemes?: SecurityScheme[];
}

/** {@link KnownToolMeta} merged with arbitrary string-keyed metadata for custom flags. */
export type ToolMeta = KnownToolMeta & Record<string, unknown>;

/**
 * Convenient return type for tool handlers — a plain string, a single
 * {@link ContentBlock}, or an array. Skybridge normalizes it to the MCP
 * `content: ContentBlock[]` shape before responding.
 */
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
  "openai/fileParams"?: string[];
};

/** @see https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx#resource-discovery */
type McpAppsToolMeta = {
  ui: McpUiToolMeta;
};

type SecuritySchemesToolMeta = {
  securitySchemes: SecurityScheme[];
};

type InternalToolMeta = Partial<
  OpenaiToolMeta & McpAppsToolMeta & SecuritySchemesToolMeta
>;

type McpAppsResourceMeta = {
  ui?: McpUiResourceMeta;
};

type OpenaiResourceMeta = {
  "openai/widgetDescription"?: string;
  "openai/widgetCSP"?: { redirect_domains?: string[] };
};

type ResourceMeta = McpAppsResourceMeta & OpenaiResourceMeta;

type ViewResourceConfig = {
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
  ) => ResourceMeta;
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

interface ToolConfig<TInput extends ZodRawShapeCompat | AnySchema> {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: TInput;
  outputSchema?: ZodRawShapeCompat | AnySchema;
  annotations?: ToolAnnotations;
  view?: ViewConfig;
  auth?: ToolAuth;
  /**
   * Declares which auth schemes this tool supports (e.g. `noauth`, `oauth2`).
   * Lets clients label tools that require sign-in before calling, and pass
   * the right scopes through the OAuth flow. Listing both `noauth` and
   * `oauth2` signals that the tool works for anonymous callers and gives
   * enhanced behavior to authenticated ones.
   */
  securitySchemes?: SecurityScheme[];
  _meta?: ToolMeta;
}

/**
 * Optional client-supplied hints attached to `params._meta` on every tool call
 * by the Apps SDK host. Hints only: never use for authorization, and tolerate
 * absence.
 * @see https://developers.openai.com/apps-sdk/reference#_meta-fields-the-client-provides
 */
export interface ClientHintsMeta {
  /** Requested locale (BCP-47, e.g. `"en-US"`). */
  "openai/locale"?: string;
  /** Browser user-agent */
  "openai/userAgent"?: string;
  /** Coarse user location. May be partially populated. */
  "openai/userLocation"?: {
    city?: string;
    region?: string;
    country?: string;
    timezone?: string;
    longitude?: number;
    latitude?: number;
  };
  /** Anonymized user id. */
  "openai/subject"?: string;
  /** Anonymized conversation id, stable within a ChatGPT session. */
  "openai/session"?: string;
  /** Anonymized organization id, when the user account is part of an organization. */
  "openai/organization"?: string;
  /** Stable id for the currently mounted widget instance. */
  "openai/widgetSessionId"?: string;
}

type ToolHandlerExtra = Omit<
  RequestHandlerExtra<ServerRequest, ServerNotification>,
  "_meta"
> & {
  _meta?: RequestMeta & ClientHintsMeta;
};

type ToolHandler<
  TInput extends ZodRawShapeCompat,
  TReturn extends { content?: HandlerContent } = { content?: HandlerContent },
> = (
  args: ShapeOutput<TInput>,
  extra: ToolHandlerExtra,
) => TReturn | Promise<TReturn>;

type ErrorMiddlewareConfig = {
  path?: string;
  handlers: ErrorRequestHandler[];
};

/**
 * Drop the query string from a `ui://` view URI, leaving the bare path. The
 * `?v=` cache key is the only query we append, so a plain split is enough and
 * sidesteps `URL` normalization quirks on the non-special `ui:` scheme.
 */
function stripQuery(uri: string): string {
  const queryIndex = uri.indexOf("?");
  return queryIndex === -1 ? uri : uri.slice(0, queryIndex);
}

/**
 * Coerce a tool handler's return value into an MCP `content` array. Strings
 * become a single `TextContent`; a single block is wrapped in an array;
 * `undefined` produces `[]`. Mostly used internally — exported so consumers
 * who build content lazily can apply the same normalization.
 */
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

/**
 * The Skybridge server. Extends the MCP SDK's `McpServer` with a typed tool
 * registry, view resources, an embedded Express app, and protocol-level
 * middleware. Construct it with the same `Implementation` info you would pass
 * to the SDK, chain {@link McpServer.registerTool} calls to declare tools,
 * then call {@link McpServer.run} to start the HTTP server.
 *
 * The `TTools` generic accumulates each registered tool's input/output/meta
 * shape, so `typeof server` carries enough information for view-side helpers
 * like {@link generateHelpers} to produce fully-typed hooks.
 *
 * @typeParam TTools - Accumulated tool registry. Filled in by `registerTool`
 * chaining; you almost never set this manually.
 *
 * @example
 * ```ts
 * const server = new McpServer({ name: "my-app", version: "1.0.0" }, {})
 *   .registerTool({
 *     name: "search",
 *     inputSchema: { query: z.string() },
 *     view: { component: "search" },
 *   }, async ({ query }) => ({ content: `Results for ${query}` }));
 *
 * await server.run();
 * export type AppType = typeof server;
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/mcp-server
 */
// Side channel populated by `dist/__entry.js` before user code is imported.
// Set at module scope rather than passed through the constructor because the
// wrapper has the manifest before the user's `new McpServer(...)` runs, and
// threading it through every call site (including user templates) is exactly
// the boilerplate this design is trying to hide.
let pendingBuildManifest: Record<string, { file: string }> | null = null;

/**
 * Prime the build-time Vite manifest before user code constructs its
 * `McpServer`. Called from the generated `dist/__entry.js`; not part of the
 * user-facing API.
 *
 * @internal
 */
export function __setBuildManifest(
  manifest: Record<string, { file: string }>,
): void {
  pendingBuildManifest = manifest;
}

let pendingSkillsManifest: SkillsManifest | null = null;

export function __setSkillsManifest(manifest: SkillsManifest): void {
  pendingSkillsManifest = manifest;
}

// Pure and `this`-free so it can run inside the `super(...)` call, before `this`
// exists — the capability must be present for the `initialize` response.
function withSkillsCapability(
  options: ServerOptions | undefined,
  skybridgeOptions: SkybridgeServerOptions | undefined,
): ServerOptions | undefined {
  if (!skybridgeOptions?.skills) {
    return options;
  }
  return {
    ...options,
    capabilities: {
      ...options?.capabilities,
      extensions: {
        ...options?.capabilities?.extensions,
        [SKILLS_EXTENSION_KEY]: { directoryRead: true },
      },
    },
  };
}

export class McpServer<
  TTools extends Record<string, ToolDef> = Record<never, ToolDef>,
> extends McpServerBaseOmitted {
  declare readonly $types: McpServerTypes<TTools>;
  /**
   * The underlying Express app. Use this to extend the HTTP server with
   * custom routes, middleware, or settings — e.g.
   * `server.express.get("/health", ...)`.
   *
   * `express.json()` is pre-applied — tune it via the constructor's third
   * argument, e.g. `new McpServer(info, {}, { json: { limit: "10mb" } })`.
   * Register your handlers before `run()`;
   * after `run()`, dev-mode middleware, the `/mcp` route, and the default
   * error handler are appended in that order.
   *
   * Note: Alpic Cloud only routes traffic to `/mcp` — custom routes work
   * locally and on self-hosted deployments.
   */
  readonly express: Express;
  private customErrorMiddleware: ErrorMiddlewareConfig[] = [];
  private mcpMiddlewareEntries: McpMiddlewareEntry[] = [];
  private mcpMiddlewareApplied = false;
  private claimedViews = new Map<string, string>();
  private viewMetaBuilders = new Map<
    string,
    (extra: McpExtra | undefined) => ResourceMeta
  >();
  /**
   * Maps a view resource's query-less path to its canonical registered URI
   * (the one carrying the `?v=` cache key). Lets `resources/read` resolve the
   * underlying view no matter which version param the consumer sends, since
   * the param is only a cache key, not part of the resource's identity.
   */
  private viewUriByPath = new Map<string, string>();
  private viteManifest: Record<string, ViteManifestEntry> | null = null;
  private readonly serverInfo: Implementation;
  private readonly serverOptions?: ServerOptions;
  private oauthEnabled = false;
  private resolveResourceMetadataUrl?: ResourceMetadataUrlResolver;
  private securitySchemesByTool = new Map<
    string,
    SecurityScheme[] | undefined
  >();

  constructor(
    serverInfo: Implementation,
    options?: ServerOptions,
    skybridgeOptions?: SkybridgeServerOptions,
  ) {
    const mergedOptions = withSkillsCapability(options, skybridgeOptions);
    super(serverInfo, mergedOptions);
    this.serverInfo = serverInfo;
    this.serverOptions = mergedOptions;
    this.express = express();
    this.express.use(express.json(skybridgeOptions?.json));
    if (skybridgeOptions?.oauth) {
      this.oauthEnabled = true;
      this.resolveResourceMetadataUrl = setupOAuth(
        this.express,
        skybridgeOptions.oauth,
        this.securitySchemesByTool,
      );
    }
    // Pick up the manifest if `dist/__entry.js` primed it before importing
    // user code. Consume-once: clear after the first construction so a
    // subsequent test that doesn't prime can't inherit stale state.
    // Explicit `setViteManifest` calls still win because they happen after
    // construction.
    if (pendingBuildManifest) {
      this.setViteManifest(pendingBuildManifest);
      pendingBuildManifest = null;
    }
    this.setupSkills(Boolean(skybridgeOptions?.skills));
  }

  private setupSkills(enabled: boolean): void {
    const manifest = pendingSkillsManifest;
    pendingSkillsManifest = null;
    if (!enabled) {
      return;
    }

    const skills = manifest ?? discoverSkills(SKILLS_DIR);
    if (skills.length === 0) {
      console.warn(
        `skybridge: the "skills" option is enabled but no skills were found in "${SKILLS_DIR}". Add a <name>/SKILL.md there, or remove the option.`,
      );
    }

    registerSkills(this, skills);
  }

  /**
   * Register Express middleware on the underlying app. Mirrors `app.use` —
   * pass handlers directly or a path-prefixed handler list. Register before
   * {@link McpServer.run}; ordering matches Express.
   *
   * Note: Alpic Cloud only routes traffic to `/mcp`. Custom paths work
   * locally and on self-hosted deployments.
   */
  use(...handlers: RequestHandler[]): this;
  use(path: string, ...handlers: RequestHandler[]): this;
  use(
    pathOrHandler: string | RequestHandler,
    ...handlers: RequestHandler[]
  ): this {
    // Branching is load-bearing: Express's `app.use` overloads can't be
    // resolved against a `string | RequestHandler` union, so we narrow.
    if (typeof pathOrHandler === "string") {
      this.express.use(pathOrHandler, ...handlers);
    } else {
      this.express.use(pathOrHandler, ...handlers);
    }
    return this;
  }

  /**
   * Register Express error-handling middleware to run after the built-in
   * `/mcp` route (or your custom route). Use this to log or transform errors
   * thrown by tool handlers before the default error handler responds.
   *
   * @example
   * ```ts
   * server.useOnError((err, _req, _res, next) => {
   *   logger.error(err);
   *   next(err);
   * });
   * ```
   */
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

    // Surface view-resource _meta on `resources/list` (per ext-apps spec:
    // hosts/checkers read CSP & domain at list time before fetching content).
    const viewListMetaEntry: McpMiddlewareEntry = {
      filter: "resources/list",
      handler: async (_req, extra, next) => {
        const result = (await next()) as {
          resources: Array<Record<string, unknown> & { uri: string }>;
        };
        for (const resource of result.resources) {
          const builder = this.viewMetaBuilders.get(resource.uri);
          if (!builder) {
            continue;
          }
          const meta = builder(extra);
          resource._meta = {
            ...((resource._meta as Record<string, unknown>) ?? {}),
            ...meta,
          };
        }
        return result;
      },
    };

    // Resolve a view's `resources/read` by its query-less path so the
    // underlying asset is served no matter the `?v=` value (stale cache key,
    // no param, etc.). The version param is a cache-busting hint for external
    // consumers; it must not gate resolution. We rewrite the lookup URI to the
    // canonical registered one, then restore the requested URI on the response
    // so the consumer-facing URI is never rewritten.
    const viewReadResolveEntry: McpMiddlewareEntry = {
      filter: "resources/read",
      handler: async (req, _extra, next) => {
        const requested = req.params.uri;
        if (typeof requested !== "string") {
          return next();
        }
        const path = stripQuery(requested);
        const canonical = this.viewUriByPath.get(path);
        if (!canonical) {
          return next();
        }
        req.params.uri = canonical;
        try {
          const result = (await next()) as {
            contents?: Array<{ uri?: string } & Record<string, unknown>>;
          };
          for (const content of result.contents ?? []) {
            if (
              typeof content.uri === "string" &&
              stripQuery(content.uri) === stripQuery(canonical)
            ) {
              content.uri = requested;
            }
          }
          return result;
        } finally {
          // Restore the shared request params so middleware outer to us never
          // observes the rewritten lookup URI after next() unwinds.
          req.params.uri = requested;
        }
      },
    };

    const toolsListSecuritySchemesEntry: McpMiddlewareEntry = {
      filter: "tools/list",
      handler: async (_req, _extra, next) => {
        const result = (await next()) as {
          tools: Array<
            Record<string, unknown> & { _meta?: Record<string, unknown> }
          >;
        };
        for (const tool of result.tools) {
          const schemes = tool._meta?.securitySchemes;
          if (schemes && !("securitySchemes" in tool)) {
            tool.securitySchemes = schemes;
          }
        }
        return result;
      },
    };

    const monitoringEntry = createMiddlewareEntry();
    const entries = [
      ...(monitoringEntry ? [monitoringEntry] : []),
      viewListMetaEntry,
      viewReadResolveEntry,
      toolsListSecuritySchemesEntry,
      ...this.mcpMiddlewareEntries,
    ];

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

  /**
   * Connect to an MCP transport (override of the SDK's `connect`). Use this
   * when you're embedding Skybridge in a host that already manages its own
   * transport (e.g. stdio for desktop apps); for HTTP, prefer {@link McpServer.run}
   * which sets the transport up for you. Locks in any middleware registered
   * via {@link McpServer.mcpMiddleware} — further calls to that method will
   * throw afterwards.
   */
  async connect(
    transport: Parameters<typeof McpServerBase.prototype.connect>[0],
  ): Promise<void> {
    this.applyMcpMiddleware();
    return McpServerBase.prototype.connect.call(this, transport);
  }

  /**
   * Per-request stateless connect. The SDK's `Protocol` only allows one
   * transport per instance, so we can't reuse this `McpServer` across
   * concurrent requests. The SDK's idiomatic fix is a `() => McpServer`
   * factory, but that would break Skybridge's singleton API — so instead
   * we build a fresh underlying `Server` per request and share the main
   * server's handler maps by reference. The cast is unavoidable: there's
   * no public API to inject handler maps. `getHandlerMaps` validates the
   * read side and fails fast on SDK field renames.
   */
  async connectStatelessTransport(
    transport: Parameters<typeof McpServerBase.prototype.connect>[0],
  ): Promise<void> {
    this.applyMcpMiddleware();

    const { requestHandlers, notificationHandlers } = getHandlerMaps(
      this.server,
    );
    const fresh = new SdkServer(this.serverInfo, this.serverOptions);
    const target = fresh as unknown as {
      _requestHandlers: unknown;
      _notificationHandlers: unknown;
    };
    target._requestHandlers = requestHandlers;
    target._notificationHandlers = notificationHandlers;

    await fresh.connect(transport);
  }

  /**
   * Start the HTTP server. Listens on `process.env.__PORT` (default `3000`),
   * mounts the `/mcp` route, applies any custom Express middleware registered
   * via {@link McpServer.use} / {@link McpServer.useOnError}, and locks in
   * any MCP middleware registered via {@link McpServer.mcpMiddleware}.
   *
   * On Cloudflare Workers / workerd, returns an object exposing `fetch` so
   * the runtime can bridge incoming requests to the Node HTTP server. On
   * Vercel (`VERCEL === "1"`), returns the Express app directly so the
   * serverless function entry can call it as a `(req, res)` handler. On
   * Node, returns `undefined` once listening.
   */
  async run(): Promise<
    { fetch: (...args: unknown[]) => unknown } | Express | undefined
  > {
    this.applyMcpMiddleware();

    if (process.env.VERCEL === "1") {
      // createApp only reads httpServer inside its dev-only branch
      // (viewsDevServer); under VERCEL=1 + NODE_ENV=production it's a
      // bare object passed to satisfy the required parameter.
      const httpServer = http.createServer();
      await createApp({
        mcpServer: this,
        httpServer,
        errorMiddleware: this.customErrorMiddleware,
      });
      return this.express;
    }

    const httpServer = http.createServer();

    await createApp({
      mcpServer: this,
      httpServer,
      errorMiddleware: this.customErrorMiddleware,
    });

    httpServer.on("request", this.express);
    const port = parseInt(process.env.__PORT ?? "3000", 10);
    await new Promise<void>((resolve, reject) => {
      httpServer.on("error", (error: Error) => {
        console.error("Failed to start server:", error);
        reject(error);
      });
      httpServer.listen(port, () => {
        resolve();
      });
    });

    // On workerd, bridge the Node http server to a Workers fetch handler.
    // The specifier is held in a variable to sidestep tsc's module resolution
    // (`cloudflare:node` only exists under wrangler/workerd).
    if (
      typeof navigator !== "undefined" &&
      navigator.userAgent === "Cloudflare-Workers"
    ) {
      const cloudflareNode = "cloudflare:node";
      const { httpServerHandler } = await import(cloudflareNode);
      return httpServerHandler({ port });
    }

    const shutdown = () => {
      // Drop both handlers so a second signal falls through to Node's default
      // (force-quit on a second Ctrl+C while drain is hanging).
      process.off("SIGTERM", shutdown);
      process.off("SIGINT", shutdown);
      httpServer.close(() => process.exit(0));
      // Force exit if connections don't drain in time so the port is still
      // released promptly (e.g. for nodemon restarts).
      setTimeout(() => process.exit(0), 3000).unref();
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
    return undefined;
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

  private resolveViewRequestContext(extra: McpExtra | undefined): {
    serverUrl: string;
    assetsBasePath: string;
    connectDomains: string[];
    contentMetaOverrides: { domain?: string };
  } {
    const isProduction = process.env.NODE_ENV === "production";
    const headers = extra?.requestInfo?.headers || {};
    const header = (key: string) => {
      const val = headers[key];
      return Array.isArray(val) ? val[0] : val;
    };
    const isClaude = header("user-agent") === "Claude-User";

    const serverUrl = resolveServerOrigin(header);
    // Path prefix the proxy routed this request under (e.g. `foo.com/v1`). Read
    // per-request so one process can serve many hosts/prefixes at once: the
    // origin is recovered from x-forwarded-host, the prefix from
    // x-forwarded-prefix. Empty when served at the origin root.
    const assetsBasePath = normalizeForwardedPrefix(
      header("x-forwarded-prefix"),
    );

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

    return { serverUrl, assetsBasePath, connectDomains, contentMetaOverrides };
  }

  private registerViewResources(
    toolName: string,
    view: ViewConfig,
    toolMeta: InternalToolMeta,
  ): void {
    // Append a content-derived version param so hosts (e.g. ChatGPT) bust
    // their cache when the bundle changes, but keep the URI stable across
    // `tools/list` calls when the bundle hasn't changed.
    const versionParam = this.computeViewVersionParam(view.component);

    const viewResource: ViewResourceConfig = {
      hostType: "mcp-app",
      uri: `ui://views/ext-apps/${view.component}.html${versionParam}`,
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
            },
          },
        };

        const ui = mergeWithUnion(mergeWithUnion(defaults, fromView), {
          ui: overrides,
        });

        const base: ResourceMeta = {
          ...ui,
          ...(view.description && {
            "openai/widgetDescription": view.description,
          }),
          ...(view.csp?.redirectDomains && {
            "openai/widgetCSP": { redirect_domains: view.csp.redirectDomains },
          }),
        };

        if (view._meta) {
          return { ...base, ...view._meta } as ResourceMeta;
        }
        return base;
      },
    };
    this.registerViewResource({ name: toolName, viewResource, view });

    // Advertise via the MCP Apps standard pointer only — ChatGPT renders from
    // ui.resourceUri (verified), and not emitting openai/outputTemplate lets us
    // retire the legacy apps-sdk resource later. The legacy apps-sdk URL is still
    // served (see registerViewResource) so already-published apps keep resolving.
    // @ts-expect-error - For backwards compatibility with Claude current implementation of the specs
    toolMeta["ui/resourceUri"] = viewResource.uri;
    toolMeta.ui = { ...toolMeta.ui, resourceUri: viewResource.uri };
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

    const buildMeta = (extra: McpExtra | undefined): ResourceMeta => {
      const { serverUrl, connectDomains, contentMetaOverrides } =
        this.resolveViewRequestContext(extra);
      return buildContentMeta(
        {
          resourceDomains: [serverUrl],
          connectDomains,
          domain: serverUrl,
          baseUriDomains: [serverUrl],
        },
        contentMetaOverrides,
      );
    };
    this.viewMetaBuilders.set(viewUri, buildMeta);
    this.viewUriByPath.set(stripQuery(viewUri), viewUri);
    this.serveLegacyAppsSdkUrl(view.component, viewUri);

    this.registerResource(
      name,
      viewUri,
      { description: view.description },
      async (uri, extra) => {
        const isProduction = process.env.NODE_ENV === "production";
        const { serverUrl, assetsBasePath } =
          this.resolveViewRequestContext(extra);
        // The view resolves all assets (template imports + runtime lazy chunks
        // via `window.skybridge.serverUrl`) against this base, so it carries the
        // proxy path prefix. CSP domains in `buildMeta` stay the bare origin.
        const viewBase = `${serverUrl}${assetsBasePath}`;

        const html = isProduction
          ? templateHelper.renderProduction({
              hostType,
              serverUrl: viewBase,
              viewFile: this.lookupViewFile(view.component),
              styleFile: this.lookupDistFile("style.css") ?? "",
            })
          : templateHelper.renderDevelopment({
              hostType,
              serverUrl: viewBase,
              viewName: view.component,
            });

        return {
          contents: [
            { uri: uri.href, mimeType, text: html, _meta: buildMeta(extra) },
          ],
        };
      },
    );
  }

  private serveLegacyAppsSdkUrl(component: string, canonicalUri: string): void {
    this.viewUriByPath.set(
      `ui://views/apps-sdk/${component}.html`,
      canonicalUri,
    );
    this.viewUriByPath.set(
      `ui://widgets/apps-sdk/${component}.html`,
      canonicalUri,
    );
    this.viewUriByPath.set(
      `ui://widgets/ext-apps/${component}.html`,
      canonicalUri,
    );
  }

  private decorateToolHandler<InputArgs extends ZodRawShapeCompat>(
    cb: ToolHandler<InputArgs>,
    {
      attachViewUUID,
      securitySchemes,
    }: { attachViewUUID: boolean; securitySchemes?: SecurityScheme[] },
  ): ToolHandler<InputArgs> {
    return async (args, extra) => {
      if (this.oauthEnabled) {
        const failure = evaluateSecuritySchemes(
          securitySchemes,
          extra.authInfo,
        );
        if (failure) {
          const headers = extra?.requestInfo?.headers ?? {};
          const header = (key: string) => {
            const value = headers[key];
            return Array.isArray(value) ? value[0] : value;
          };
          const challenge = wwwAuthenticateHeader(
            failure,
            this.resolveResourceMetadataUrl?.(header),
          );
          return {
            isError: true,
            content: [{ type: "text", text: failure.description }],
            _meta: { "mcp/www_authenticate": [challenge] },
          };
        }
      }
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

  private computeViewVersionParam(viewName: string): string {
    if (process.env.NODE_ENV !== "production") {
      return "";
    }
    try {
      const viewFile = this.lookupViewFile(viewName);
      const styleFile = this.lookupDistFile("style.css") ?? "";
      const hash = crypto
        .createHash("sha256")
        .update(viewFile)
        .update("\0")
        .update(styleFile)
        .digest("hex")
        .slice(0, 8);
      return `?v=${hash}`;
    } catch {
      return "";
    }
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

  /**
   * Inject the Vite manifest as a value rather than letting `readManifest()`
   * load it from disk. Required for runtimes without a usable filesystem
   * (Cloudflare Workers, etc.) — the user's `skybridge build` emits the
   * manifest as a JS module which the entry imports and passes here.
   */
  setViteManifest(manifest: Record<string, { file: string }>): this {
    this.viteManifest = manifest as Record<string, ViteManifestEntry>;
    return this;
  }

  private readManifest(): Record<string, ViteManifestEntry> {
    if (this.viteManifest) {
      return this.viteManifest;
    }
    return JSON.parse(
      readFileSync(
        path.join(process.cwd(), "dist", "assets", ".vite", "manifest.json"),
        "utf-8",
      ),
    );
  }

  /**
   * Register a tool. Pass a `config` describing the tool (name, schemas,
   * optional {@link ViewConfig}, optional {@link ToolMeta}) and a handler that
   * returns the tool's result.
   *
   * Chain calls to build up a server: each call returns a new `McpServer`
   * type that captures the tool's input/output/`_meta` shape so the
   * resulting `typeof server` can drive {@link generateHelpers}.
   *
   * The handler's return shape determines the output types: the
   * `structuredContent` field becomes the tool's typed output, and `_meta`
   * becomes its `responseMetadata`. The `content` field is normalized through
   * {@link normalizeContent}.
   *
   * @example
   * ```ts
   * server.registerTool({
   *   name: "search",
   *   inputSchema: { query: z.string() },
   *   outputSchema: { results: z.array(z.string()) },
   *   view: { component: "search" },
   * }, async ({ query }) => ({
   *   content: `Found results for ${query}`,
   *   structuredContent: { results: [...] },
   * }));
   * ```
   *
   * @see https://docs.skybridge.tech/api-reference/register-tool
   */
  registerTool<
    TName extends string,
    InputArgs extends ZodRawShapeCompat,
    TReturn extends { content?: HandlerContent },
  >(
    config: ToolConfig<InputArgs> & { name: TName },
    cb: ToolHandler<InputArgs, TReturn>,
  ): AddTool<
    TTools,
    TName,
    InputArgs,
    ExtractStructuredContent<TReturn>,
    ExtractMeta<TReturn>
  >;
  registerTool<InputArgs extends ZodRawShapeCompat>(
    config: ToolConfig<InputArgs>,
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

    const config = args[0] as ToolConfig<ZodRawShapeCompat>;
    const cb = args[1] as ToolHandler<ZodRawShapeCompat>;

    const {
      name,
      view,
      auth,
      securitySchemes: rawSecuritySchemes,
      _meta: userToolMeta,
      ...toolFields
    } = config;

    if (
      rawSecuritySchemes === undefined &&
      auth !== undefined &&
      auth !== "public" &&
      !this.oauthEnabled
    ) {
      throw new Error(
        `Tool "${name}" sets \`auth: ${JSON.stringify(auth)}\` but the server has no \`oauth\` provider configured.`,
      );
    }

    const securitySchemes =
      rawSecuritySchemes ??
      (auth && this.oauthEnabled ? authToSecuritySchemes(auth) : undefined);

    const toolMeta: InternalToolMeta = { ...userToolMeta };

    this.securitySchemesByTool.set(name, securitySchemes);

    if (securitySchemes) {
      // SEP-1488 puts `securitySchemes` at the top level of the tool
      // descriptor, but the SDK's `registerTool` drops unknown top-level
      // fields, so the canonical spot isn't reachable without intercepting
      // `tools/list`. Use the `_meta` back-compat mirror documented in the
      // Apps SDK reference until SEP-1488 lands in the spec.
      toolMeta.securitySchemes = securitySchemes;
    }

    if (view) {
      this.enforceOneToolPerView(view.component, name);
      this.registerViewResources(name, view, toolMeta);
    }

    const wrappedCb = this.decorateToolHandler(cb, {
      attachViewUUID: Boolean(view),
      securitySchemes,
    });

    baseFn.call(this, name, { ...toolFields, _meta: toolMeta }, wrappedCb);

    return this;
  }
}

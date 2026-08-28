import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  McpUiResourceMeta,
  McpUiToolMeta,
} from "@modelcontextprotocol/ext-apps";
import {
  type CacheHint,
  type ContentBlock,
  type Icon,
  type Implementation,
  McpServer as McpServerBase,
  type PromptCallback,
  type ReadResourceCallback,
  type ReadResourceTemplateCallback,
  type RegisteredPrompt,
  type RegisteredResource,
  type RegisteredResourceTemplate,
  type RequestMeta,
  type ResourceMetadata,
  type ResourceTemplate,
  type ServerOptions,
  type ServerResult,
  type StandardSchemaV1,
  type StandardSchemaWithJSON,
  type ToolAnnotations,
} from "@modelcontextprotocol/server";
import { mergeWith, union } from "es-toolkit";
import type express from "express";
import { warnOnLargeToolOutput } from "../context-warnings.js";
import type { InferSchemaOutput, RawInputShape } from "../standard-schema.js";
import type { OAuthConfig } from "./auth/index.js";
import {
  authToSecuritySchemes,
  evaluateSecuritySchemes,
  inBandChallengeResult,
} from "./auth/security-schemes.js";
import type { ResourceMetadataUrlResolver } from "./auth/setup.js";
import type { ExtraClaims } from "./auth.js";
import { hostFromUserAgent } from "./host.js";
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
import { captureToolError } from "./middleware.js";
import { resolveServerOrigin } from "./requestOrigin.js";
import {
  discoverSkills,
  registerSkills,
  SKILLS_EXTENSION_KEY,
  type SkillRegistrar,
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
 * The runtime a served view page declares on `window.skybridge`. Every view
 * emits a single ext-apps resource, so this is always `"mcp-app"`; the Apps
 * SDK runtime is detected at load time via `window.openai` instead.
 */
export type ViewHostType = "mcp-app";

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

/**
 * Declarative per-tool auth. Enforced when the server has an `oauth` provider:
 * anonymous or under-scoped calls are rejected before the handler runs. Omit
 * `auth` entirely for the secure default (sign-in required, no specific scope).
 */
export type ToolAuth = {
  /**
   * When `true`, the tool is callable signed out; the token is still used when
   * one is present. Omit (or `false`) to require sign-in.
   */
  allowsAnonymous?: boolean;
  /** OAuth scopes the caller's token must carry to invoke the tool. */
  scopes?: string[];
};

/**
 * Options forwarded to the built-in `express.json()` body parser. Derived
 * from Express's own types so the public API doesn't depend on `body-parser`.
 */
export type JsonOptions = NonNullable<Parameters<typeof express.json>[0]>;

/**
 * Skybridge-specific options, part of the {@link SkybridgeConfig} bag passed to
 * the `Skybridge` constructor.
 *
 * @typeParam TAuthExtra - Claims the `oauth` verifier populates. Inferred from
 * the config a provider returns, and carried on to tool handlers.
 */
export interface SkybridgeServerOptions<
  TAuthExtra extends ExtraClaims = ExtraClaims,
> {
  /** Options for the built-in `express.json()` middleware, e.g. `{ limit: "10mb" }`. */
  json?: JsonOptions;
  /** Resource-server OAuth config. When set, mounts well-known metadata and bearer auth on `/mcp`. */
  oauth?: OAuthConfig<TAuthExtra>;
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

type ShapeOutput<Shape extends RawInputShape> = Simplify<
  {
    [K in keyof Shape as undefined extends InferSchemaOutput<Shape[K]>
      ? never
      : K]: InferSchemaOutput<Shape[K]>;
  } & {
    [K in keyof Shape as undefined extends InferSchemaOutput<Shape[K]>
      ? K
      : never]?: InferSchemaOutput<Shape[K]>;
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
  TInput extends RawInputShape,
  TOutput,
  TResponseMetadata = unknown,
  TAuthExtra extends ExtraClaims = ExtraClaims,
> = McpServer<
  TTools & {
    [K in TName]: ToolDef<ShapeOutput<TInput>, TOutput, TResponseMetadata>;
  },
  TAuthExtra
>;

interface ToolConfigBase<TInput extends RawInputShape | StandardSchemaV1> {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: TInput;
  outputSchema?: RawInputShape | StandardSchemaV1;
  annotations?: ToolAnnotations;
  view?: ViewConfig;
  _meta?: ToolMeta;
}

/**
 * The auth face of a tool config: either the high-level `auth` shorthand or the
 * low-level `securitySchemes` escape hatch, never both.
 */
type ToolAuthConfig =
  | { auth?: ToolAuth; securitySchemes?: never }
  | {
      auth?: never;
      /**
       * Declares which auth schemes this tool supports (e.g. `noauth`, `oauth2`).
       * Lets clients label tools that require sign-in before calling, and pass
       * the right scopes through the OAuth flow. Listing both `noauth` and
       * `oauth2` signals that the tool works for anonymous callers and gives
       * enhanced behavior to authenticated ones.
       */
      securitySchemes?: SecurityScheme[];
    };

type ToolConfig<TInput extends RawInputShape | StandardSchemaV1> =
  ToolConfigBase<TInput> & ToolAuthConfig;

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

type ToolHandlerExtra<TAuthExtra extends ExtraClaims = ExtraClaims> = Omit<
  McpExtra<TAuthExtra>,
  "mcpReq"
> & {
  mcpReq: Omit<McpExtra<TAuthExtra>["mcpReq"], "_meta"> & {
    _meta?: RequestMeta & ClientHintsMeta;
  };
};

type ToolHandler<
  TInput extends RawInputShape,
  TReturn extends { content?: HandlerContent } = { content?: HandlerContent },
  TAuthExtra extends ExtraClaims = ExtraClaims,
> = (
  args: ShapeOutput<TInput>,
  extra: ToolHandlerExtra<TAuthExtra>,
) => TReturn | Promise<TReturn>;

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
  extends Omit<
    McpServerBase,
    "registerTool" | "registerResource" | "registerPrompt" | "connect"
  > {}
const McpServerBaseOmitted = McpServerBase as unknown as new (
  ...args: ConstructorParameters<typeof McpServerBase>
) => McpServerBaseOmitted;

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
let cachedDiskManifest: Record<string, ViteManifestEntry> | null = null;
let discoveredSkills: SkillsManifest | null = null;
let warnedOnMissingSkills = false;

export function __setSkillsManifest(manifest: SkillsManifest): void {
  pendingSkillsManifest = manifest;
  discoveredSkills = null;
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

/**
 * Typed registration sugar over the MCP SDK's `McpServer`: a tool registry
 * that carries input/output/meta shapes, view resources, per-tool security
 * schemes, and prompt/resource registration. A {@link Skybridge} app builds
 * one of these per request and hands it to your setup factory; chain
 * {@link McpServer.registerTool} calls on it and return the result.
 *
 * The `TTools` generic accumulates each registered tool's input/output/meta
 * shape, so `typeof app` carries enough information for view-side helpers
 * like {@link generateHelpers} to produce fully-typed hooks.
 *
 * @typeParam TTools - Accumulated tool registry. Filled in by `registerTool`
 * chaining; you almost never set this manually.
 *
 * @example
 * ```ts
 * export const app = new Skybridge({ name: "my-app", version: "1.0.0" }, (server) =>
 *   server.registerTool({
 *     name: "search",
 *     inputSchema: { query: z.string() },
 *     view: { component: "search" },
 *   }, async ({ query }) => ({ content: `Results for ${query}` })),
 * );
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/mcp-server
 */
export class McpServer<
  TTools extends Record<string, ToolDef> = Record<never, ToolDef>,
  TAuthExtra extends ExtraClaims = ExtraClaims,
> extends McpServerBaseOmitted {
  declare readonly $types: McpServerTypes<TTools>;
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
  private oauthEnabled = false;
  private resolveResourceMetadataUrl?: ResourceMetadataUrlResolver;
  private readonly toolSecuritySchemes = new Map<
    string,
    SecurityScheme[] | undefined
  >();
  private readonly userMiddlewareEntries: McpMiddlewareEntry[] = [];

  constructor(
    serverInfo: Implementation,
    options?: ServerOptions,
    skybridgeOptions?: SkybridgeServerOptions<TAuthExtra>,
  ) {
    super(serverInfo, withSkillsCapability(options, skybridgeOptions));
    this.oauthEnabled = Boolean(skybridgeOptions?.oauth);
    // Pick up the manifest if `dist/__entry.js` primed it before importing
    // user code. Explicit `setViteManifest` calls still win because they
    // happen after construction.
    if (pendingBuildManifest) {
      this.setViteManifest(pendingBuildManifest);
    }
    this.setupSkills(Boolean(skybridgeOptions?.skills));
  }

  /**
   * The per-tool security schemes collected during registration, keyed by tool
   * name. Read by the OAuth layer to decide whether anonymous requests are
   * allowed and which schemes gate a given `tools/call`.
   *
   * @internal
   */
  get securitySchemesByTool(): ReadonlyMap<
    string,
    SecurityScheme[] | undefined
  > {
    return this.toolSecuritySchemes;
  }

  /**
   * Inject the resolver the app uses to build the protected-resource metadata
   * URL, so tool handlers can emit in-band auth challenges.
   *
   * @internal
   */
  setResourceMetadataUrlResolver(resolve: ResourceMetadataUrlResolver): this {
    this.resolveResourceMetadataUrl = resolve;
    return this;
  }

  /**
   * Register a resource. Signature owned by Skybridge (not inherited) so a
   * typed wrapper can land in a minor without a type-level break.
   */
  registerResource(
    name: string,
    uri: string,
    config: ResourceMetadata & { cacheHint?: CacheHint },
    readCallback: ReadResourceCallback,
  ): RegisteredResource;
  registerResource(
    name: string,
    template: ResourceTemplate,
    config: ResourceMetadata & { cacheHint?: CacheHint },
    readCallback: ReadResourceTemplateCallback,
  ): RegisteredResourceTemplate;
  registerResource(...args: unknown[]): unknown {
    return this.applyInherited("registerResource", args);
  }

  /**
   * Register a prompt. Signature owned by Skybridge (not inherited) so a
   * typed wrapper can land in a minor without a type-level break.
   */
  registerPrompt<Args extends StandardSchemaWithJSON>(
    name: string,
    config: {
      title?: string;
      description?: string;
      argsSchema?: Args;
      icons?: Icon[];
      _meta?: Record<string, unknown>;
    },
    cb: PromptCallback<Args>,
  ): RegisteredPrompt {
    return this.applyInherited("registerPrompt", [
      name,
      config,
      cb,
    ]) as RegisteredPrompt;
  }

  private applyInherited(
    method: "registerResource" | "registerPrompt",
    args: unknown[],
  ): unknown {
    const base = McpServerBase.prototype[method] as (
      ...a: unknown[]
    ) => unknown;
    return base.apply(this, args);
  }

  private skillRegistrar(): SkillRegistrar {
    const registerResource = (
      this as unknown as { registerResource: (...a: unknown[]) => unknown }
    ).registerResource.bind(this) as SkillRegistrar["registerResource"];
    return { registerResource, server: this.server };
  }

  private setupSkills(enabled: boolean): void {
    if (!enabled) {
      return;
    }

    discoveredSkills ??= pendingSkillsManifest ?? discoverSkills(SKILLS_DIR);
    if (discoveredSkills.length === 0 && !warnedOnMissingSkills) {
      warnedOnMissingSkills = true;
      console.warn(
        `skybridge: the "skills" option is enabled but no skills were found in "${SKILLS_DIR}". Add a <name>/SKILL.md there, or remove the option.`,
      );
    }

    registerSkills(this.skillRegistrar(), discoveredSkills);
  }

  /** Register MCP protocol-level middleware (catch-all). */
  mcpMiddleware(handler: McpMiddlewareFn<TAuthExtra>): this;
  /** Register MCP protocol-level middleware for all requests (`extra` is `McpExtra`). */
  mcpMiddleware(
    filter: "request",
    handler: (
      request: { method: string; params: Record<string, unknown> },
      extra: McpExtra<TAuthExtra>,
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
    handler: McpTypedMiddlewareFn<M, TAuthExtra>,
  ): this;
  /**
   * Register MCP protocol-level middleware for a wildcard pattern (e.g. `"tools/*"`).
   * `next()` returns the union of result types for matching methods.
   */
  mcpMiddleware<W extends McpWildcard>(
    filter: W,
    handler: (
      request: { method: string; params: Record<string, unknown> },
      extra: McpExtraFor<W, TAuthExtra>,
      next: () => Promise<McpResultFor<W>>,
    ) => Promise<unknown> | unknown,
  ): this;
  /**
   * Register MCP protocol-level middleware with a method filter.
   * Filter can be an exact method (`"tools/call"`), wildcard (`"tools/*"`),
   * category (`"request"` | `"notification"`), or an array of those.
   */
  mcpMiddleware(
    filter: McpMiddlewareFilter,
    handler: McpMiddlewareFn<TAuthExtra>,
  ): this;
  mcpMiddleware(
    filterOrHandler: McpMiddlewareFilter | McpMiddlewareFn<TAuthExtra>,
    // biome-ignore lint/suspicious/noExplicitAny: overloads narrow the handler type at call sites; implementation must accept all variants
    maybeHandler?: any,
  ): this {
    const handler = maybeHandler as McpMiddlewareFn | undefined;

    if (typeof filterOrHandler === "function") {
      this.userMiddlewareEntries.push({
        filter: null,
        handler: filterOrHandler as McpMiddlewareFn,
      });
    } else if (handler) {
      this.userMiddlewareEntries.push({
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

  /**
   * This instance's protocol-level middleware: the framework's own entries
   * (view `_meta` on `resources/list`, version-agnostic view resolution on
   * `resources/read`, the top-level `securitySchemes` mirror on `tools/list`)
   * followed by the ones registered via {@link McpServer.mcpMiddleware}.
   *
   * @internal
   */
  protocolMiddlewareEntries(): McpMiddlewareEntry[] {
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

    // ChatGPT reads `securitySchemes` at the tool descriptor top level (SEP-1488,
    // still Draft), but the SDK's registerTool strips unknown top-level fields, so
    // it's stashed in `_meta` at registration. This restores it to the top level
    // on tools/list output. Remove once SEP-1488 lands and the SDK preserves it.
    //   { name: "checkout", _meta: { securitySchemes: [{ type: "oauth2" }] } }
    //     -> { name: "checkout", _meta: {…}, securitySchemes: [{ type: "oauth2" }] }
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

    return [
      viewListMetaEntry,
      viewReadResolveEntry,
      toolsListSecuritySchemesEntry,
      ...this.userMiddlewareEntries,
    ];
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

  private resolveViewRequestContext(ctx: McpExtra | undefined): {
    serverUrl: string;
    assetsBasePath: string;
    connectDomains: string[];
    contentMetaOverrides: { domain?: string };
  } {
    const isProduction = process.env.NODE_ENV === "production";
    const header = (key: string) =>
      ctx?.http?.req?.headers.get(key) ?? undefined;
    const isClaude = hostFromUserAgent(header("user-agent")) === "claude";

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
      const pathname = ctx?.http?.req ? new URL(ctx.http.req.url).pathname : "";
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

  private decorateToolHandler<InputArgs extends RawInputShape>(
    cb: ToolHandler<InputArgs>,
    {
      attachViewUUID,
      securitySchemes,
      toolName,
    }: {
      attachViewUUID: boolean;
      securitySchemes?: SecurityScheme[];
      toolName: string;
    },
  ): ToolHandler<InputArgs> {
    return async (args, extra) => {
      if (this.oauthEnabled) {
        const failure = evaluateSecuritySchemes(
          securitySchemes,
          extra.http?.authInfo,
        );
        if (failure) {
          const header = (key: string) =>
            extra.http?.req?.headers.get(key) ?? undefined;
          return inBandChallengeResult(
            failure,
            this.resolveResourceMetadataUrl?.(header),
          );
        }
      }
      let result: Awaited<ReturnType<typeof cb>>;
      try {
        result = await cb(args, extra);
      } catch (error) {
        captureToolError(extra, error);
        throw error;
      }
      warnOnLargeToolOutput(result, toolName);
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
    cachedDiskManifest ??= JSON.parse(
      readFileSync(
        path.join(process.cwd(), "dist", "assets", ".vite", "manifest.json"),
        "utf-8",
      ),
    );
    return cachedDiskManifest ?? {};
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
    InputArgs extends RawInputShape,
    TReturn extends { content?: HandlerContent },
  >(
    config: ToolConfig<InputArgs> & { name: TName },
    cb: ToolHandler<InputArgs, TReturn, TAuthExtra>,
  ): AddTool<
    TTools,
    TName,
    InputArgs,
    ExtractStructuredContent<TReturn>,
    ExtractMeta<TReturn>,
    TAuthExtra
  >;
  registerTool<InputArgs extends RawInputShape>(
    config: ToolConfig<InputArgs>,
    cb: ToolHandler<InputArgs, { content?: HandlerContent }, TAuthExtra>,
  ): this;
  registerTool(rawConfig: unknown, rawCb: unknown): unknown {
    const baseFn = McpServerBase.prototype.registerTool as (
      ...args: unknown[]
    ) => unknown;

    const config = rawConfig as ToolConfig<RawInputShape>;
    const cb = rawCb as ToolHandler<RawInputShape>;

    const {
      name,
      view,
      auth,
      securitySchemes: rawSecuritySchemes,
      _meta: userToolMeta,
      ...toolFields
    } = config;

    const authNeedsProvider =
      auth !== undefined &&
      (!auth.allowsAnonymous || Boolean(auth.scopes?.length));
    if (
      rawSecuritySchemes === undefined &&
      authNeedsProvider &&
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

    this.toolSecuritySchemes.set(name, securitySchemes);

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
      toolName: name,
    });

    baseFn.call(
      this,
      name,
      { ...toolFields, _meta: toolMeta },
      toolFields.inputSchema === undefined
        ? (extra: ToolHandlerExtra) =>
            wrappedCb({} as ShapeOutput<RawInputShape>, extra)
        : wrappedCb,
    );

    return this;
  }
}

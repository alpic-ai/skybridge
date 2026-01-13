import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  McpUiResourceMeta,
  McpUiToolMeta,
} from "@modelcontextprotocol/ext-apps";
import {
  McpServer as McpServerBase,
  type RegisteredTool,
  type ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  AnySchema,
  SchemaOutput,
  ZodRawShapeCompat,
} from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  CallToolResult,
  Resource,
  ServerNotification,
  ServerRequest,
  ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import { mergeWith, union } from "es-toolkit";
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

/** @see https://developers.openai.com/apps-sdk/reference#tool-descriptor-parameters */
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

type ToolMeta = OpenaiToolMeta & McpAppsToolMeta;

/** @see https://developers.openai.com/apps-sdk/reference#component-resource-_meta-fields */
type OpenaiWidgetCSP = {
  /** Domains the widget may contact via fetch/XHR */
  connect_domains: string[];
  /** Domains for static assets (images, fonts, scripts, styles) */
  resource_domains: string[];
  /** Origins allowed for iframe embeds (opts into stricter app review) */
  frame_domains?: string[];
  /** Origins that can receive openExternal redirects without safe-link modal */
  redirect_domains?: string[];
};

type OpenaiResourceMeta = {
  "openai/widgetDescription"?: string;
  "openai/widgetPrefersBorder"?: boolean;
  "openai/widgetCSP"?: OpenaiWidgetCSP;
  "openai/widgetDomain"?: string;
};

/**
 * Extended MCP Apps CSP with upcoming fields from ext-apps PR #158
 * and Skybridge-specific fields for OpenAI compatibility
 * @see https://github.com/modelcontextprotocol/ext-apps/pull/158
 */
type ExtendedMcpUiResourceCsp = McpUiResourceMeta["csp"] & {
  /**
   * Origins that can receive openExternal redirects without safe-link modal (OpenAI-specific)
   * @see https://developers.openai.com/apps-sdk/reference#component-resource-_meta-fields
   */
  redirectDomains?: string[];
};

/** Extended MCP Apps resource metadata with upcoming CSP fields */
type ExtendedMcpUiResourceMeta = Omit<McpUiResourceMeta, "csp"> & {
  csp?: ExtendedMcpUiResourceCsp;
};

/** MCP Apps resource metadata */
type McpAppsResourceMeta = {
  ui?: ExtendedMcpUiResourceMeta;
};

type ResourceMeta = OpenaiResourceMeta | McpAppsResourceMeta;

/** User-provided resource configuration with optional CSP override */
export type WidgetResourceMeta = {
  ui?: ExtendedMcpUiResourceMeta;
} & Resource["_meta"];

export type WidgetHostType = "apps-sdk" | "mcp-app";

type WidgetResourceConfig<T extends ResourceMeta = ResourceMeta> = {
  hostType: WidgetHostType;
  uri: string;
  mimeType: string;
  /** Function to build _meta for this resource content given computed defaults */
  buildContentMeta: (defaults: {
    resourceDomains: string[];
    connectDomains: string[];
    domain: string;
    baseUriDomains: string[];
  }) => T;
};

type McpServerOriginalResourceConfig = Omit<
  Resource,
  "uri" | "name" | "mimeType" | "_meta"
> & {
  _meta?: WidgetResourceMeta;
};

type McpServerOriginalToolConfig = Omit<
  Parameters<
    typeof McpServerBase.prototype.registerTool<
      ZodRawShapeCompat,
      ZodRawShapeCompat
    >
  >[1],
  "inputSchema" | "outputSchema"
>;

type Simplify<T> = { [K in keyof T]: T[K] };

type ExtractStructuredContent<T> = T extends { structuredContent: infer SC }
  ? Simplify<SC>
  : never;

type ExtractMeta<T> = [Extract<T, { _meta: unknown }>] extends [never]
  ? unknown
  : Extract<T, { _meta: unknown }> extends { _meta: infer M }
    ? Simplify<M>
    : unknown;

/**
 * Type-level marker interface for cross-package type inference.
 * This enables TypeScript to infer tool types across package boundaries
 * using structural typing on the $types property, rather than relying on
 * class generic inference which fails when McpServer comes from different
 * package installations.
 *
 * Inspired by tRPC's _def pattern and Hono's type markers.
 */
export interface McpServerTypes<TTools extends Record<string, ToolDef>> {
  readonly tools: TTools;
}
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
type ToolConfig<TInput extends ZodRawShapeCompat | AnySchema> = {
  title?: string;
  description?: string;
  inputSchema?: TInput;
  outputSchema?: ZodRawShapeCompat | AnySchema;
  annotations?: ToolAnnotations;
  _meta?: Record<string, unknown>;
};

type ToolHandler<
  TInput extends ZodRawShapeCompat,
  TReturn extends { content: CallToolResult["content"] } = CallToolResult,
> = (
  args: ShapeOutput<TInput>,
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
) => TReturn | Promise<TReturn>;

export class McpServer<
  TTools extends Record<string, ToolDef> = Record<never, ToolDef>,
> extends McpServerBase {
  declare readonly $types: McpServerTypes<TTools>;

  registerWidget<
    TName extends string,
    TInput extends ZodRawShapeCompat,
    TReturn extends { content: CallToolResult["content"] },
  >(
    name: TName,
    resourceConfig: McpServerOriginalResourceConfig,
    toolConfig: McpServerOriginalToolConfig & {
      inputSchema?: TInput;
      outputSchema?: ZodRawShapeCompat | AnySchema;
    },
    toolCallback: ToolHandler<TInput, TReturn>,
  ): AddTool<
    TTools,
    TName,
    TInput,
    ExtractStructuredContent<TReturn>,
    ExtractMeta<TReturn>
  > {
    const userMeta = resourceConfig._meta;

    const appsSdkResourceConfig: WidgetResourceConfig<OpenaiResourceMeta> = {
      hostType: "apps-sdk",
      uri: `ui://widgets/apps-sdk/${name}.html`,
      mimeType: "text/html+skybridge",
      buildContentMeta: ({ resourceDomains, connectDomains, domain }) => {
        const userUi = userMeta?.ui;
        const userCsp = userUi?.csp;

        const defaults: OpenaiResourceMeta = {
          "openai/widgetCSP": {
            resource_domains: resourceDomains,
            connect_domains: connectDomains,
          },
          "openai/widgetDomain": domain,
          "openai/widgetDescription": toolConfig.description,
        };

        const fromUi: Partial<
          Omit<
            OpenaiResourceMeta,
            "openai/widgetCSP" | "openai/widgetDescription"
          > & {
            "openai/widgetCSP": Partial<OpenaiWidgetCSP>;
          }
        > = {
          "openai/widgetCSP": {
            resource_domains: userCsp?.resourceDomains,
            connect_domains: userCsp?.connectDomains,
            frame_domains: userCsp?.frameDomains,
            redirect_domains: userCsp?.redirectDomains,
          },
          "openai/widgetDomain": userUi?.domain,
          "openai/widgetPrefersBorder": userUi?.prefersBorder,
        };

        const directOpenaiKeys = Object.fromEntries(
          Object.entries(userMeta ?? {}).filter(([key]) =>
            key.startsWith("openai/"),
          ),
        );

        return mergeWithUnion(
          mergeWithUnion(defaults, fromUi),
          directOpenaiKeys,
        );
      },
    };

    const extAppsResourceConfig: WidgetResourceConfig<McpAppsResourceMeta> = {
      hostType: "mcp-app",
      uri: `ui://widgets/ext-apps/${name}.html`,
      mimeType: "text/html;profile=mcp-app",
      buildContentMeta: ({ resourceDomains, connectDomains, domain }) => {
        const defaults: McpAppsResourceMeta = {
          ui: {
            csp: {
              resourceDomains,
              connectDomains,
            },
            domain,
          },
        };

        return mergeWithUnion(defaults, { ui: userMeta?.ui });
      },
    };

    [appsSdkResourceConfig, extAppsResourceConfig].forEach((widgetConfig) => {
      this.registerWidgetResource({
        name,
        widgetConfig,
        resourceConfig,
      });
    });

    const toolMeta: ToolMeta = {
      ...toolConfig._meta,
      "openai/outputTemplate": appsSdkResourceConfig.uri,
      ui: {
        resourceUri: extAppsResourceConfig.uri,
      },
    };

    this.registerTool(
      name,
      {
        ...toolConfig,
        _meta: toolMeta,
      },
      toolCallback,
    );

    return this as AddTool<
      TTools,
      TName,
      TInput,
      ExtractStructuredContent<TReturn>,
      ExtractMeta<TReturn>
    >;
  }

  override registerTool<
    TName extends string,
    InputArgs extends ZodRawShapeCompat,
    TReturn extends { content: CallToolResult["content"] },
  >(
    name: TName,
    config: ToolConfig<InputArgs>,
    cb: ToolHandler<InputArgs, TReturn>,
  ): AddTool<
    TTools,
    TName,
    InputArgs,
    ExtractStructuredContent<TReturn>,
    ExtractMeta<TReturn>
  >;

  override registerTool<InputArgs extends ZodRawShapeCompat>(
    name: string,
    config: ToolConfig<InputArgs>,
    cb: ToolHandler<InputArgs>,
  ): RegisteredTool;

  override registerTool<InputArgs extends ZodRawShapeCompat>(
    name: string,
    config: ToolConfig<InputArgs>,
    cb: ToolCallback<InputArgs>,
  ): RegisteredTool | McpServer<Record<string, ToolDef>> {
    super.registerTool(name, config, cb);
    return this;
  }

  private registerWidgetResource({
    name,
    widgetConfig,
    resourceConfig,
  }: {
    name: string;
    widgetConfig: WidgetResourceConfig;
    resourceConfig: McpServerOriginalResourceConfig;
  }): void {
    const {
      hostType,
      uri: widgetUri,
      mimeType,
      buildContentMeta,
    } = widgetConfig;

    this.registerResource(
      name,
      widgetUri,
      { ...resourceConfig, _meta: resourceConfig._meta },
      async (uri, extra) => {
        const isProduction = process.env.NODE_ENV === "production";

        const serverUrl = isProduction
          ? `https://${extra?.requestInfo?.headers?.["x-forwarded-host"] ?? extra?.requestInfo?.headers?.host}`
          : "http://localhost:3000";

        const html = isProduction
          ? templateHelper.renderProduction({
              hostType,
              serverUrl,
              widgetFile: this.lookupDistFileWithIndexFallback(
                `src/widgets/${name}`,
              ),
              styleFile: this.lookupDistFile("style.css"),
            })
          : templateHelper.renderDevelopment({
              hostType,
              serverUrl,
              widgetName: name,
            });

        const VITE_HMR_WEBSOCKET_DEFAULT_URL = "ws://localhost:24678";

        const contentMeta = buildContentMeta({
          resourceDomains: [serverUrl],
          connectDomains: !isProduction ? [VITE_HMR_WEBSOCKET_DEFAULT_URL] : [],
          domain: serverUrl,
          baseUriDomains: [serverUrl],
        });

        return {
          contents: [
            { uri: uri.href, mimeType, text: html, _meta: contentMeta },
          ],
        };
      },
    );
  }

  private lookupDistFile(key: string): string {
    const manifest = this.readManifest();
    return manifest[key]?.file;
  }

  private lookupDistFileWithIndexFallback(basePath: string): string {
    const manifest = this.readManifest();

    const flatFileKey = `${basePath}.tsx`;
    const indexFileKey = `${basePath}/index.tsx`;
    return manifest[flatFileKey]?.file ?? manifest[indexFileKey]?.file;
  }

  private readManifest() {
    return JSON.parse(
      readFileSync(
        path.join(process.cwd(), "dist", "assets", ".vite", "manifest.json"),
        "utf-8",
      ),
    );
  }
}

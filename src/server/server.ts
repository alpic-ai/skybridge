import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  RegisteredTool,
  ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpServer as McpServerBase } from "@modelcontextprotocol/sdk/server/mcp.js";
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
import { templateHelper } from "./templateHelper.js";

export type ToolDef<TInput = unknown, TOutput = unknown> = {
  input: TInput;
  output: TOutput;
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
  "ui/resourceUri": string;
};

type ToolMeta = OpenaiToolMeta & McpAppsToolMeta;

/** @see https://developers.openai.com/apps-sdk/reference#component-resource-_meta-fields */
type OpenaiResourceMeta = {
  "openai/widgetDescription"?: string;
  "openai/widgetPrefersBorder"?: boolean;
  "openai/widgetCSP"?: Record<"connect_domains" | "resource_domains", string[]>;
  "openai/widgetDomain"?: string;
};

/** @see https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx#ui-resource-format */
type McpAppsResourceMeta = {
  csp?: {
    connectDomains?: string[];
    resourceDomains?: string[];
  };
  domain?: string;
  prefersBorder?: boolean;
};

type ResourceMeta = OpenaiResourceMeta & McpAppsResourceMeta;

type McpServerOriginalResourceConfig = Omit<
  Resource,
  "uri" | "name" | "mimeType"
>;

type McpServerOriginalToolConfig = Omit<
  Parameters<
    typeof McpServerBase.prototype.registerTool<
      ZodRawShapeCompat,
      ZodRawShapeCompat
    >
  >[1],
  "inputSchema" | "outputSchema"
>;

type ExtractStructuredContent<T> = T extends { structuredContent: infer SC }
  ? SC
  : never;

/**
 * Type-level marker interface for cross-package type inference.
 * This enables TypeScript to infer tool types across package boundaries
 * using structural typing on the $types property, rather than relying on
 * class generic inference which fails when McpServer comes from different
 * package installations.
 *
 * Inspired by tRPC's _def pattern and Hono's type markers.
 */
export interface McpServerTypes<TTools extends Record<string, ToolDef> = {}> {
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
type AddTool<
  TTools,
  TName extends string,
  TInput extends ZodRawShapeCompat,
  TOutput
> = McpServer<
  TTools & {
    [K in TName]: ToolDef<ShapeOutput<TInput>, TOutput>;
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
  TReturn extends CallToolResult = CallToolResult
> = (
  args: ShapeOutput<TInput>,
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) => TReturn | Promise<TReturn>;

export class McpServer<
  TTools extends Record<string, ToolDef> = {}
> extends McpServerBase {
  declare readonly $types: McpServerTypes<TTools>;

  registerWidget<
    TName extends string,
    TInput extends ZodRawShapeCompat,
    TReturn extends CallToolResult
  >(
    name: TName,
    resourceConfig: McpServerOriginalResourceConfig,
    toolConfig: McpServerOriginalToolConfig & {
      inputSchema?: TInput;
      outputSchema?: ZodRawShapeCompat | AnySchema;
    },
    toolCallback: ToolHandler<TInput, TReturn>
  ): AddTool<TTools, TName, TInput, ExtractStructuredContent<TReturn>> {
    const uri = `ui://widgets/${name}.html`;
    const resourceMetadata: ResourceMeta = {
      ...(resourceConfig._meta ?? {}),
    };
    if (toolConfig.description !== undefined) {
      resourceMetadata["openai/widgetDescription"] = toolConfig.description;
    }

    this.resource(
      name,
      uri,
      {
        ...resourceConfig,
        _meta: resourceMetadata,
      },
      async (_uri, extra) => {
        const serverUrl =
          process.env.NODE_ENV === "production"
            ? `https://${
                extra?.requestInfo?.headers?.["x-forwarded-host"] ??
                extra?.requestInfo?.headers?.host
              }`
            : `http://localhost:3000`;

        const html =
          process.env.NODE_ENV === "production"
            ? templateHelper.renderProduction({
                serverUrl,
                widgetFile: this.lookupDistFile(`src/widgets/${name}.tsx`),
                styleFile: this.lookupDistFile("style.css"),
              })
            : templateHelper.renderDevelopment({
                serverUrl,
                widgetName: name,
              });

        return {
          contents: [
            {
              uri,
              mimeType: "text/html+skybridge",
              text: html,
            },
          ],
        };
      }
    );

    const toolMeta: ToolMeta = {
      ...toolConfig._meta,
      "openai/outputTemplate": uri,
      "ui/resourceUri": uri,
    };

    this.registerTool(
      name,
      {
        ...toolConfig,
        _meta: toolMeta,
      },
      toolCallback
    );

    return this as AddTool<
      TTools,
      TName,
      TInput,
      ExtractStructuredContent<TReturn>
    >;
  }

  override registerTool<
    TName extends string,
    InputArgs extends ZodRawShapeCompat,
    TReturn extends CallToolResult
  >(
    name: TName,
    config: ToolConfig<InputArgs>,
    cb: ToolHandler<InputArgs, TReturn>
  ): AddTool<TTools, TName, InputArgs, ExtractStructuredContent<TReturn>>;

  override registerTool<InputArgs extends ZodRawShapeCompat>(
    name: string,
    config: ToolConfig<InputArgs>,
    cb: ToolHandler<InputArgs>
  ): RegisteredTool;

  override registerTool<InputArgs extends ZodRawShapeCompat>(
    name: string,
    config: ToolConfig<InputArgs>,
    cb: ToolCallback<InputArgs>
  ): RegisteredTool | McpServer<Record<string, ToolDef>> {
    super.registerTool(name, config, cb);
    return this;
  }

  private lookupDistFile(key: string): string {
    const manifest = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "dist", "assets", ".vite", "manifest.json"),
        "utf-8"
      )
    );

    return manifest[key]?.file;
  }
}

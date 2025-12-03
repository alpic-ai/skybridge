import {
  McpServer as McpServerBase,
  type ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Resource } from "@modelcontextprotocol/sdk/types.js";
import type { ZodRawShape, ZodObject, infer as Infer } from "zod";
import { templateHelper } from "./templateHelper.js";
import { readFileSync } from "node:fs";
import path from "node:path";

export type WidgetDef<
  TInput = unknown,
  TOutput = unknown
> = {
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
  Parameters<McpServerBase["registerTool"]>[1],
  "inputSchema" | "outputSchema"
>;

export class McpServer<
  TWidgets extends Record<string, WidgetDef> = {}
> extends McpServerBase {
  widget<
    TName extends string,
    TInput extends ZodRawShape,
    TOutput extends ZodRawShape = {}
  >(
    name: TName,
    resourceConfig: McpServerOriginalResourceConfig,
    toolConfig: McpServerOriginalToolConfig & {
      inputSchema?: TInput;
      outputSchema?: TOutput;
    },
    toolCallback: ToolCallback<TInput>
  ): McpServer<
    TWidgets & {
      [K in TName]: WidgetDef<
        Infer<ZodObject<TInput>>,
        Infer<ZodObject<TOutput>>
      >;
    }
  > {
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

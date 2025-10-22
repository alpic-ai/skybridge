import {
  McpServer as McpServerBase,
  type ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Resource } from "@modelcontextprotocol/sdk/types.js";
import type { ZodRawShape } from "zod";
import { templateHelper } from "./templateHelper.js";

/** @see https://developers.openai.com/apps-sdk/reference#tool-descriptor-parameters */
type ToolMeta = {
  "openai/outputTemplate": string;
  "openai/widgetAccessible"?: boolean;
  "openai/toolInvocation/invoking"?: string;
  "openai/toolInvocation/invoked"?: string;
};

/** @see https://developers.openai.com/apps-sdk/reference#component-resource-_meta-fields */
type ResourceMeta = {
  "openai/widgetDescription"?: string;
  "openai/widgetPrefersBorder"?: boolean;
  "openai/widgetCSP"?: Record<"connect_domains" | "resource_domains", string[]>;
  "openai/widgetDomain"?: string;
};

type McpServerOriginalResourceConfig = Omit<
  Resource,
  "uri" | "name" | "mimeType"
>;

type McpServerOriginalToolConfig = Omit<
  Parameters<McpServer["registerTool"]>[1],
  "inputSchema" | "outputSchema"
>;

export class McpServer extends McpServerBase {
  widget<InputArgs extends ZodRawShape, OutputArgs extends ZodRawShape>(
    name: string,
    resourceConfig: McpServerOriginalResourceConfig,
    toolConfig: McpServerOriginalToolConfig & {
      inputSchema?: InputArgs;
      outputSchema?: OutputArgs;
    },
    toolCallback: ToolCallback<InputArgs>
  ) {
    const uri = `ui://widgets/${name}.html`;
    const resourceMetadata: ResourceMeta = { ...(resourceConfig._meta ?? {}) };
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

        const templateData = {
          serverUrl,
          widgetName: name,
        };

        const html =
          process.env.NODE_ENV === "production"
            ? templateHelper.renderProduction(templateData)
            : templateHelper.renderDevelopment(templateData);

        return {
          contents: [
            {
              uri,
              mimeType: "text/html+skybridge",
              text:
                process.env.NODE_ENV === "production"
                  ? html
                  : templateHelper.injectViteClient(html, templateData),
            },
          ],
        };
      }
    );

    const toolMeta: ToolMeta = {
      ...toolConfig._meta,
      "openai/outputTemplate": uri,
    };

    this.registerTool(
      name,
      {
        ...toolConfig,
        _meta: toolMeta,
      },
      toolCallback
    );
  }
}

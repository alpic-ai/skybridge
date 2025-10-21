import { McpServer as McpServerBase, type ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Resource } from "@modelcontextprotocol/sdk/types.js";
import type { ZodRawShape } from "zod";

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

type McpServerOriginalResourceConfig = Omit<Resource, "uri" | "name" | "mimeType">;

type McpServerOriginalToolConfig = Omit<Parameters<McpServer["registerTool"]>[1], "inputSchema" | "outputSchema">;

export class McpServer extends McpServerBase {
  widget<InputArgs extends ZodRawShape, OutputArgs extends ZodRawShape>(
    name: string,
    resourceConfig: McpServerOriginalResourceConfig,
    toolConfig: McpServerOriginalToolConfig & {
      inputSchema?: InputArgs;
      outputSchema?: OutputArgs;
    },
    toolCallback: ToolCallback<InputArgs>,
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
            ? `https://${extra?.requestInfo?.headers?.host}`
            : `http://localhost:3000`;

        const injectViteClient = (html: string) =>
          `
            <script type="module">import { injectIntoGlobalHook } from "${serverUrl}/@react-refresh";
            injectIntoGlobalHook(window);
            window.$RefreshReg$ = () => {};
            window.$RefreshSig$ = () => (type) => type;
            window.__vite_plugin_react_preamble_installed__ = true;
            </script>

            <script type="module" src="${serverUrl}/@vite/client"></script>
        ` + html;

        const buildHtml = () => {
          if (process.env.NODE_ENV === "production") {
            try {
              return `
                <div id="root"></div>
                <script type="module">
                  import('${serverUrl}/assets/${name}.js');
                </script>
                <link rel="stylesheet" crossorigin href="${serverUrl}/assets/style.css">
              `;
            } catch (error) {
              console.error("Failed to load production assets:", error);
              return "";
            }
          }

          return `
          <div id="root"></div>
            <script type="module">
              import('${serverUrl}/src/widgets/${name}.tsx');
            </script>
          `;
        };

        const html = buildHtml();

        return {
          contents: [
            {
              uri,
              mimeType: "text/html+skybridge",
              text: process.env.NODE_ENV === "production" ? html : injectViteClient(html),
            },
          ],
        };
      },
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
      toolCallback,
    );
  }
}

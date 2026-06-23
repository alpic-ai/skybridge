import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { McpServer, type ToolMeta, type ViewConfig } from "skybridge/server";
import { z } from "zod/v3";
import { exampleOpenuiProgram, openuiPrompt } from "./openui/library.js";

type ToolConfig<InputArgs extends ZodRawShapeCompat | undefined = undefined> = {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: InputArgs;
  outputSchema?: ZodRawShapeCompat;
  annotations?: ToolAnnotations;
  view?: ViewConfig;
  _meta?: ToolMeta;
};

type RegisterTool = <InputArgs extends ZodRawShapeCompat | undefined>(
  config: ToolConfig<InputArgs>,
  cb: ToolCallback<InputArgs>,
) => McpServer;

const renderInputSchema = {
  code: z
    .string()
    .describe(
      "OpenUI Lang code. The first statement must assign root = Stack(...).",
    ),
};

const server = new McpServer(
  {
    name: "openui-generative-ui",
    version: "0.0.1",
  },
  { capabilities: {} },
);

const registerTool = server.registerTool.bind(server) as RegisterTool;

registerTool(
  {
    name: "get-openui-prompt",
    description:
      "Returns the OpenUI Lang component prompt and an example program. Call this before render to learn the available components and syntax.",
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
  },
  async () => ({
    content: [
      {
        type: "text" as const,
        text: openuiPrompt,
      },
    ],
  }),
);

registerTool(
  {
    name: "render",
    description:
      "Render a dynamic UI from an OpenUI Lang program. Call get-openui-prompt first, then pass only valid OpenUI Lang code.",
    inputSchema: renderInputSchema,
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
    view: {
      component: "render",
      description:
        "Renders an OpenUI Lang program with the standard OpenUI component library",
    },
  },
  async ({ code }) => ({
    structuredContent: { code },
    content: [
      {
        type: "text" as const,
        text: "OpenUI Lang UI rendered successfully.",
      },
    ],
    isError: false,
  }),
);

registerTool(
  {
    name: "render-example",
    description:
      "Render the bundled OpenUI Lang example. Use this for a quick smoke test before generating a custom UI.",
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
    view: {
      component: "render-example",
      description: "Renders the bundled OpenUI Lang example",
    },
  },
  async () => ({
    structuredContent: { code: exampleOpenuiProgram },
    content: [
      {
        type: "text" as const,
        text: "Example OpenUI Lang UI rendered successfully.",
      },
    ],
    isError: false,
  }),
);

export default await server.run();

export type AppType = typeof server;

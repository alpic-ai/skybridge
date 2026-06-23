import { McpServer } from "skybridge/server";
import { z } from "zod/v3";
import { exampleOpenuiProgram, openuiPrompt } from "./openui/library.js";

type RenderArgs = { code: string };
type TextContent = { type: "text"; text: string };
type ToolResult = {
  structuredContent?: Record<string, string>;
  content: TextContent[];
  isError?: boolean;
};
type ToolHandler = (
  args: Record<string, unknown>,
) => ToolResult | Promise<ToolResult>;
type RegisterTool = (
  config: Record<string, unknown>,
  handler: ToolHandler,
) => unknown;

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

const registerTool = server.registerTool.bind(
  server,
) as unknown as RegisterTool;

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
  async (args) => {
    const { code } = args as RenderArgs;

    return {
      structuredContent: { code },
      content: [
        {
          type: "text" as const,
          text: "OpenUI Lang UI rendered successfully.",
        },
      ],
      isError: false,
    };
  },
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

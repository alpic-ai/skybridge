import { McpServer, type ToolDef } from "skybridge/server";
import { z } from "zod";
import { openuiPrompt } from "./openui/library.js";

type AppTools = {
  "get-openui-prompt": ToolDef<Record<string, never>, never, unknown>;
  render: ToolDef<{ code: string }, Record<string, never>, unknown>;
};
export type AppType = McpServer<AppTools>;

type RenderResult = {
  structuredContent: Record<string, never>;
  content: string;
  isError: false;
};

const renderInputSchema: { code: z.ZodTypeAny } = {
  code: z
    .string()
    .describe(
      "OpenUI Lang code. The first statement must assign root = Stack(...).",
    ),
};

async function getOpenuiPrompt() {
  return {
    content: openuiPrompt,
  };
}

async function renderOpenui(): Promise<RenderResult> {
  return {
    structuredContent: {},
    content: "OpenUI Lang UI rendered successfully.",
    isError: false,
  };
}

const server: McpServer = new McpServer({
  name: "openui-generative-ui",
  version: "0.0.1",
})
  .registerTool(
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
    getOpenuiPrompt,
  )
  .registerTool(
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
    renderOpenui,
  );

export default await server.run();

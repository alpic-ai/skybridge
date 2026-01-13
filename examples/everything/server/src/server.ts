import { McpServer } from "skybridge/server";
import { z } from "zod";

const server = new McpServer(
  {
    name: "alpic-openai-app",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerWidget(
  "widget",
  {
    description: "A playground to discover the Skybridge framework",
    hosts: ["apps-sdk"],
  },
  {
    description: "A simple greeting tool",
    inputSchema: {
      name: z.string().describe("The user name"),
    },
    _meta: {
      "openai/widgetAccessible": true,
    },
  },
  async ({ name }) => {
    const structuredContent = {
      greeting: `Hi ${name}, this tool response content is visible by both you and the LLM`,
    };
    return {
      structuredContent,
      content: [{ type: "text", text: JSON.stringify(structuredContent) }],
      isError: false,
      _meta: {
        secret: "But _meta is only visible to you",
      },
    };
  },
);

export default server;
export type AppType = typeof server;

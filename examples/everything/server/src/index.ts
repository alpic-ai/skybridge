import { McpServer } from "skybridge/server";
import { z } from "zod";

const server: McpServer = new McpServer(
  {
    name: "alpic-openai-app",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerWidget(
  "show-everything",
  {
    description: "A playground to discover the Skybridge framework",
    _meta: {
      ui: {
        csp: {
          redirectDomains: ["https://docs.skybridge.tech", "https://alpic.ai"],
        },
      },
    },
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

server.run();

export type AppType = typeof server;

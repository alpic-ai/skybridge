import { McpServer } from "skybridge/server";
import { z } from "zod";

const server = new McpServer(
  {
    name: "alpic-openai-app",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerWidget(
  "hello-world",
  {
    description: "Hello World widget",
  },
  {
    description: "A hero widget with customizable title and subtitle.",
    inputSchema: {
      title: z.string().optional().describe("The main title to display."),
      subtitle: z.string().optional().describe("The subtitle to display."),
    },
  },
  async ({ title, subtitle }) => {
    return {
      structuredContent: { title, subtitle },
      content: [],
      isError: false,
    };
  },
);

export default server;
export type AppType = typeof server;

import { intentMiddleware } from "@alpic-ai/insights";
import { Skybridge } from "skybridge/server";
import { z } from "zod";

export const app = new Skybridge({
  name: "alpic-openai-app",
  version: "0.0.1",
  handler: (server) =>
    server
      .registerTool(
        {
          name: "hello-world",
          description: "A hero widget with customizable title and subtitle.",
          inputSchema: {
            title: z.string().optional().describe("The main title to display."),
            subtitle: z
              .string()
              .optional()
              .describe("The subtitle to display."),
          },
          view: {
            component: "hello-world",
            description: "Hello World widget",
            csp: {
              resourceDomains: ["https://avatars.githubusercontent.com"],
            },
          },
        },
        async ({ title, subtitle }) => {
          return {
            structuredContent: { title, subtitle },
            content: [],
            isError: false,
          };
        },
      )
      .mcpMiddleware(intentMiddleware()),
});

export type AppType = typeof app;

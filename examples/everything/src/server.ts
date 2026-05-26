import { intentMiddleware } from "@alpic-ai/insights";
import { McpServer } from "skybridge/server";
import { z } from "zod";

const server = new McpServer(
  {
    name: "alpic-openai-app",
    version: "0.0.1",
  },
  { capabilities: {} },
)
  .mcpMiddleware(intentMiddleware())
  .registerTool(
    {
      name: "show-everything",
      description: "A simple greeting tool",
      inputSchema: {
        name: z.string().describe("The user name"),
      },
      view: {
        component: "show-everything",
        description: "A playground to discover the Skybridge framework",
        csp: {
          redirectDomains: [
            "https://docs.skybridge.tech",
            "https://alpic.ai",
            "https://github.com",
          ],
        },
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

server.registerTool(
  {
    name: "flip-coin",
    description: "Flips a coin and checks if the user's guess is correct",
    inputSchema: {
      guess: z.enum(["heads", "tails"]).describe("The user's guess"),
    },
    _meta: {
      "openai/widgetAccessible": true,
    },
  },
  async ({ guess }) => {
    const flip = Math.random() < 0.5 ? "heads" : "tails";
    const won = guess === flip;
    const structuredContent = { flip, guess, won };
    return {
      structuredContent,
      content: [{ type: "text", text: JSON.stringify(structuredContent) }],
      isError: false,
    };
  },
);

server.run();

export type AppType = typeof server;

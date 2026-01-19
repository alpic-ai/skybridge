import { McpServer } from "skybridge/server";
import { z } from "zod";

const server = new McpServer(
  {
    name: "productivity",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerWidget(
  "productivity",
  {
    description: "Weekly Productivity Chart",
  },
  {
    description: "Display user's weekly productivity chart",
    inputSchema: {
      weekOffset: z
        .number()
        .optional()
        .default(0)
        .describe(
          "Week offset from current week (0 = this week, -1 = last week)",
        ),
    },
    _meta: {
      "openai/widgetAccessible": true,
    },
  },
  async ({ weekOffset }) => {
    try {
      if (weekOffset > 0) {
        throw new Error("Offset must be negative or zero");
      }
      const structuredContent = { totalHours: 30 + ((weekOffset * 7) % 15) };
      return {
        structuredContent,
        content: [
          {
            type: "text",
            text: JSON.stringify(structuredContent),
          },
        ],
        isError: false,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error while computing productivity";
      return {
        content: [
          {
            type: "text",
            text: message,
          },
        ],
        isError: true,
      };
    }
  },
);

export default server;
export type AppType = typeof server;

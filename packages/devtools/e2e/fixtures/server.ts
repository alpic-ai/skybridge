import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "skybridge/server";
import { z } from "zod";

// Run from the web/ subdir so viewsDevServer finds vite.config.ts there.
const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(fixtureDir, "web"));

process.env.__PORT = process.env.__PORT ?? "4101";

const server = new McpServer(
  {
    name: "e2e-fixture",
    version: "0.0.0",
  },
  { capabilities: {} },
)
  .registerTool(
    {
      name: "echo",
      description: "Echo back the input message",
      inputSchema: { message: z.string().describe("The message to echo") },
    },
    async ({ message }) => ({
      structuredContent: { message },
      content: [{ type: "text", text: message }],
      isError: false,
    }),
  )
  .registerTool(
    {
      name: "echo-card",
      description: "Echo back the input message and render it in a widget",
      inputSchema: { message: z.string().describe("The message to echo") },
      view: {
        component: "echo-card",
        description: "Echo card widget",
      },
    },
    async ({ message }) => ({
      structuredContent: { message },
      content: [{ type: "text", text: message }],
      isError: false,
    }),
  )
  .registerTool(
    {
      name: "every-input-type",
      description:
        "Exercises every common input type the form renderer handles.",
      inputSchema: {
        name: z.string().optional().describe("Free-form string"),
        age: z
          .number()
          .int()
          .min(0)
          .max(120)
          .optional()
          .describe("Integer, 0–120"),
        favoriteNumber: z.number().optional().describe("Any number"),
        isDeveloper: z.boolean().optional().describe("Boolean toggle"),
        experienceLevel: z
          .enum(["beginner", "intermediate", "advanced"])
          .optional()
          .describe("String enum"),
        interests: z.array(z.string()).optional().describe("Array of strings"),
        colors: z
          .array(z.enum(["red", "green", "blue", "yellow", "purple"]))
          .min(1)
          .max(3)
          .optional()
          .describe("Multi-select (array of enums), pick 1–3"),
        bio: z
          .string()
          .max(500)
          .optional()
          .describe("Long text (>= multi-line in the form)"),
        preferences: z
          .object({
            enableNotifications: z.boolean().optional(),
            maxExamples: z.number().int().min(1).max(10).optional(),
            theme: z.enum(["system", "light", "dark"]).optional(),
          })
          .optional()
          .describe("Nested object"),
      },
    },
    async (input) => ({
      structuredContent: input,
      content: [{ type: "text", text: JSON.stringify(input, null, 2) }],
      isError: false,
    }),
  );

export type AppType = typeof server;

await server.run();

console.log(`E2E fixture MCP server listening on port ${process.env.__PORT}`);

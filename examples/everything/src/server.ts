import { intentMiddleware } from "@alpic-ai/insights";
import { FileRef, McpServer, text } from "skybridge/server";
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
  )
  .registerTool(
    {
      name: "flip-coin",
      description: "Flips a coin and checks if the user's guess is correct",
      inputSchema: {
        guess: z.enum(["heads", "tails"]).describe("The user's guess"),
      },
      outputSchema: {
        flip: z
          .enum(["heads", "tails"])
          .describe("The side the coin landed on"),
        guess: z.enum(["heads", "tails"]).describe("The user's guess"),
        won: z.boolean().describe("Whether the user won"),
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
        content: [
          text(
            `Coin landed on ${flip}. User guessed ${guess} and ${won ? "won" : "lost"}.`,
          ),
        ],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "inspect-file",
      description:
        "Read a file the user uploaded and echo it back as a downloadable reference.",
      inputSchema: {
        file: FileRef,
      },
      outputSchema: {
        file: FileRef.describe("The same file, echoed back as a reference"),
        sizeBytes: z.number().describe("The file's size in bytes"),
      },
      _meta: {
        // FileRef inputs must be listed here so ChatGPT routes the attachment to them.
        "openai/fileParams": ["file"],
        // Let the view hand a file to this tool.
        "openai/widgetAccessible": true,
      },
    },
    async ({ file }) => {
      const blob = await fetch(file.download_url).then((res) => res.blob());
      // Echo the same bytes (same file_id / download_url) under a changed
      // file_name, so the returned ref is visibly distinct from the input.
      const echoed = {
        ...file,
        file_name: `echoed-${file.file_name ?? "file"}`,
      };
      const structuredContent = { file: echoed, sizeBytes: blob.size };
      return {
        structuredContent,
        content: [
          text(
            `Echoing ${file.file_name ?? "file"} as ${echoed.file_name} (${blob.size} bytes).`,
          ),
        ],
        isError: false,
      };
    },
  );

export default await server.run();

export type AppType = typeof server;

import { McpServer } from "skybridge/server";
import { z } from "zod";

const Answers = [
  "As I see it, yes",
  "Don't count on it",
  "It is certain",
  "It is decidedly so",
  "Most likely",
  "My reply is no",
  "My sources say no",
  "Outlook good",
  "Outlook not so good",
  "Signs point to yes",
  "Very doubtful",
  "Without a doubt",
  "Yes definitely",
  "Yes",
  "You may rely on it",
];

const server = new McpServer(
  {
    name: "alpic-openai-app",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerWidget(
  "magic-8-ball",
  {
    description: "Magic 8 Ball",
  },
  {
    description: "For fortune-telling or seeking advice.",
    inputSchema: {
      question: z.string().describe("The user question."),
    },
  },
  async ({ question }) => {
    try {
      // deterministic answer
      const hash = question
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const answer = Answers[hash % Answers.length];
      return {
        structuredContent: { answer },
        content: [],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error}` }],
        isError: true,
      };
    }
  },
);

export default server;
export type AppType = typeof server;

import { McpServer } from "skybridge/server";
import { z } from "zod";

const Answers = [
  "As I see it, yes",
  "Ask again later",
  "Better not tell you now",
  "Cannot predict now",
  "Concentrate and ask again",
  "Don't count on it",
  "It is certain",
  "It is decidedly so",
  "Most likely",
  "My reply is no",
  "My sources say no",
  "Outlook good",
  "Outlook not so good",
  "Reply hazy, try again",
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
      const answer = Answers[Math.floor(Math.random() * Answers.length)];
      return {
        /**
         * Arbitrary JSON passed only to the component.
         * Use it for data that should not influence the model’s reasoning, like the full set of locations that backs a dropdown.
         * _meta is never shown to the model.
         */
        _meta: {},
        /**
         * Structured data that is used to hydrate your component.
         * ChatGPT injects this object into your iframe as window.openai.toolOutput
         */
        structuredContent: { question, answer },
        /**
         * Optional free-form text that the model receives verbatim
         */
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

import "./env.js";
import { McpServer, text } from "skybridge/server";
import { z } from "zod";
import { generateAnswer } from "./rag/answer.js";
import { searchDocs } from "./rag/retrieval.js";

// How many passages back each answer. Enough for cross-page questions while
// keeping every citation reviewable at a glance.
const RETRIEVAL_TOP_K = 5;

const server = new McpServer(
  {
    name: "docs-qa",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerTool(
  {
    name: "ask-docs",
    description:
      "Answer questions about Skybridge (the TypeScript framework for building ChatGPT and MCP Apps) from its official documentation. Retrieves the most relevant docs passages and returns an answer where every claim carries a [n] citation the user can inspect. Use it whenever the user asks how Skybridge works, what an API does, or how to build, test, or deploy a Skybridge app.",
    inputSchema: {
      question: z
        .string()
        .describe(
          "The question to answer from the Skybridge docs, e.g. 'How do I call a tool from a view?'",
        ),
    },
    outputSchema: {
      question: z.string().describe("The question that was asked."),
      answer: z
        .string()
        .optional()
        .describe("Answer with [n] markers citing the sources."),
      sources: z
        .array(
          z.object({
            id: z.number().describe("Citation number used in the answer."),
            title: z.string().describe("Documentation page title."),
            section: z
              .string()
              .nullable()
              .describe("Section heading, or null for a page intro."),
            url: z.string().describe("Deep link to the cited section."),
          }),
        )
        .optional(),
      error: z
        .string()
        .optional()
        .describe("Why the question could not be answered."),
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
      destructiveHint: false,
    },
    _meta: {
      "openai/widgetAccessible": true,
      "openai/toolInvocation/invoking": "Searching the Skybridge docs…",
      "openai/toolInvocation/invoked": "Answer ready.",
    },
    view: {
      component: "ask-docs",
      description:
        "Cited answer from the Skybridge docs, with clickable source-passage previews.",
    },
  },
  async ({ question }) => {
    try {
      const retrieved = await searchDocs(question, RETRIEVAL_TOP_K);
      const answer = await generateAnswer(question, retrieved);

      const sources = retrieved.map(({ chunk }, index) => ({
        id: index + 1,
        title: chunk.pageTitle,
        section: chunk.section,
        url: chunk.url,
      }));
      const sourceLines = sources
        .map(
          (source) =>
            `[${source.id}] ${source.title}${source.section ? ` › ${source.section}` : ""} — ${source.url}`,
        )
        .join("\n");

      return {
        _meta: {
          // Full passages are for the view's preview panel only; the model
          // already gets the answer, so don't flood it with raw docs text.
          passages: retrieved.map(({ chunk, score }, index) => ({
            id: index + 1,
            text: chunk.text,
            score: Math.round(score * 1000) / 1000,
          })),
        },
        structuredContent: { question, answer, sources },
        content: [text(`${answer}\n\nSources:\n${sourceLines}`)],
        isError: false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        structuredContent: { question, error: message },
        content: [text(`Could not answer from the docs: ${message}`)],
        isError: true,
      };
    }
  },
);

export default await server.run();

export type AppType = typeof server;

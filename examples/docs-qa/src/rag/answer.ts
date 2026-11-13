import { complete } from "./openai.js";
import type { RetrievedChunk } from "./retrieval.js";

const SYSTEM_PROMPT = `You answer questions about Skybridge, a fullstack TypeScript framework for building ChatGPT and MCP Apps.

Rules:
- Use ONLY the numbered documentation passages provided. Never answer from prior knowledge.
- Put a citation like [1] (or [2][3] for several) immediately after every claim, matching the passage numbers.
- If the passages do not answer the question, say so in one sentence and name the passage closest to the topic.
- Write plain prose: no headings, no bullet lists, no code blocks. Wrap identifiers like \`registerTool\` in backticks.
- Keep the answer under 150 words.`;

// Enough context to answer from, small enough to keep the request fast.
const MAX_PASSAGE_CHARS = 1500;

function formatPassage(retrieved: RetrievedChunk, id: number): string {
  const { chunk } = retrieved;
  const breadcrumb = chunk.section
    ? `${chunk.pageTitle} › ${chunk.section}`
    : chunk.pageTitle;
  return `[${id}] ${breadcrumb}\n${chunk.text.slice(0, MAX_PASSAGE_CHARS)}`;
}

/**
 * Drop [n] markers that do not point at a retrieved source. The model is told
 * to cite only the numbered passages, but nothing stops it from emitting [6]
 * with five passages; a dangling marker would render as a citation chip with
 * no source behind it. Valid markers are left untouched.
 */
export function stripInvalidCitations(
  answer: string,
  sourceCount: number,
): string {
  return answer
    .replace(/\s*\[(\d+)\]/g, (marker, index: string) => {
      const id = Number(index);
      return id >= 1 && id <= sourceCount ? marker : "";
    })
    .trim();
}

/** Generate a cited answer from the retrieved passages. */
export async function generateAnswer(
  question: string,
  retrieved: RetrievedChunk[],
): Promise<string> {
  const passages = retrieved
    .map((item, index) => formatPassage(item, index + 1))
    .join("\n\n");
  return complete(
    SYSTEM_PROMPT,
    `Question: ${question}\n\nPassages:\n\n${passages}`,
  );
}

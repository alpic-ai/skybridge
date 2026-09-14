import { type DocChunk, loadCorpus } from "./corpus.js";
import { embed } from "./openai.js";

type IndexedChunk = DocChunk & { vector: number[] };

export type RetrievedChunk = { chunk: DocChunk; score: number };

// Re-ingest the docs periodically so a long-running server picks up edits.
const INDEX_TTL_MS = 60 * 60 * 1000;

let cache: { promise: Promise<IndexedChunk[]>; builtAt: number } | null = null;

// Embedding a section under its page + heading breadcrumb disambiguates
// passages that read alike out of context (e.g. multiple "Parameters"
// sections).
function embeddingInput(chunk: DocChunk): string {
  const breadcrumb = chunk.section
    ? `${chunk.pageTitle} › ${chunk.section}`
    : chunk.pageTitle;
  return `${breadcrumb}\n\n${chunk.text}`;
}

async function buildIndex(): Promise<IndexedChunk[]> {
  const chunks = await loadCorpus();
  const vectors = await embed(chunks.map(embeddingInput));
  return chunks.map((chunk, i) => ({ ...chunk, vector: vectors[i] }));
}

function getIndex(): Promise<IndexedChunk[]> {
  if (!cache || Date.now() - cache.builtAt > INDEX_TTL_MS) {
    const promise = buildIndex();
    cache = { promise, builtAt: Date.now() };
    // A transient failure (network, rate limit) must not poison the cache.
    promise.catch(() => {
      if (cache?.promise === promise) {
        cache = null;
      }
    });
  }
  return cache.promise;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
}

/** Return the top-k documentation chunks most similar to the question. */
export async function searchDocs(
  question: string,
  k: number,
): Promise<RetrievedChunk[]> {
  const [index, [questionVector]] = await Promise.all([
    getIndex(),
    embed([question]),
  ]);
  return index
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(questionVector, chunk.vector),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ chunk: { vector: _vector, ...chunk }, score }) => ({
      chunk,
      score,
    }));
}

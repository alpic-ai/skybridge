// Minimal OpenAI REST client. Two endpoints are enough for the whole RAG
// loop, so we call them with fetch instead of pulling in an SDK.
const BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const ANSWER_MODEL = process.env.OPENAI_ANSWER_MODEL ?? "gpt-5-mini";

// The embeddings endpoint caps inputs per request; stay well under it.
const EMBEDDING_BATCH_SIZE = 128;

function apiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is not set. Copy .env.example to .env and add your key.",
    );
  }
  return key;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `OpenAI ${path} failed (HTTP ${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }
  return (await response.json()) as T;
}

/** Embed a list of texts, preserving input order. */
export async function embed(texts: string[]): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
    const result = await post<{
      data: Array<{ index: number; embedding: number[] }>;
    }>("/embeddings", { model: EMBEDDING_MODEL, input: batch });
    for (const item of result.data) {
      vectors[i + item.index] = item.embedding;
    }
  }
  return vectors;
}

/** One-shot chat completion; returns the assistant message text. */
export async function complete(system: string, user: string): Promise<string> {
  const result = await post<{
    choices: Array<{ message: { content: string | null } }>;
  }>("/chat/completions", {
    model: ANSWER_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const content = result.choices[0]?.message.content;
  if (!content) {
    throw new Error("OpenAI returned an empty completion");
  }
  return content.trim();
}

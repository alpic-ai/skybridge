# Docs Q&A Example

An example MCP app built with [Skybridge](https://docs.skybridge.tech/home): retrieval-augmented Q&A over the Skybridge documentation, with a cited-answer view where every claim links back to the exact docs passage it came from.

## What This Example Showcases

- **Server-Side RAG Pipeline**: The MCP server ingests the live docs (fetch → chunk by section → embed), retrieves the passages most similar to the question, and generates an answer constrained to those passages
- **Cited Answers**: Every claim in the answer carries a `[n]` citation rendered as an interactive chip; clicking it opens the exact source passage the claim came from
- **Source-Passage Previews**: Each source expands to show the retrieved docs passage, its similarity score, and a deep link into [docs.skybridge.tech](https://docs.skybridge.tech) via [useOpenExternal()](https://docs.skybridge.tech/api-reference/use-open-external)
- **Follow-Up Questions from the Widget**: An input inside the view calls the same tool again using [useCallTool()](https://docs.skybridge.tech/api-reference/use-call-tool)
- **Model/View Data Separation**: The compact cited answer goes to the model via `structuredContent`, while the full passage texts ship view-only in `_meta` so the model's context isn't flooded with raw docs ([registerTool return](https://docs.skybridge.tech/api-reference/register-tool#return))
- **Dynamic LLM Context with `data-llm`**: The view narrates which source the user is reading via the [data-llm](https://docs.skybridge.tech/api-reference/data-llm) attribute, so follow-ups like "tell me more about this one" resolve correctly
- **Tool Info Access**: The view reads the mounting tool call's output and metadata via [useToolInfo()](https://docs.skybridge.tech/api-reference/use-tool-info)
- **Theme Support**: Adapts to the host's light/dark theme via [useLayout()](https://docs.skybridge.tech/api-reference/use-layout)
- **Hot Module Replacement**: [Live reloading](https://docs.skybridge.tech/concepts/fast-iteration#hmr-with-vite-plugin) of widget components during development
- **Local DevTools**: [DevTools](https://docs.skybridge.tech/test/devtools) at `http://localhost:3000` for local testing

## How It Works

```
question ──► embed ──► cosine top-k over doc chunks ──► answer model ──► cited answer
                          ▲                                                  │
llms.txt + per-page .md ──┘ (fetched & chunked at first use, cached 1h)      ▼
                                                    view: answer + [n] chips + passage previews
```

1. **Ingest** (`src/rag/corpus.ts`): the docs site publishes an index of every page at [`/llms.txt`](https://docs.skybridge.tech/llms.txt) and each page as raw markdown at `<page-url>.md`. The server fetches all pages and splits them into per-section chunks that remember their page, heading, and deep-link anchor.
2. **Index** (`src/rag/retrieval.ts`): each chunk is embedded (prefixed with its page › section breadcrumb for context) with `text-embedding-3-small`. The index is built lazily on the first question and cached in memory for an hour.
3. **Retrieve**: the question is embedded and the top 5 chunks by cosine similarity are selected.
4. **Generate** (`src/rag/answer.ts`): an answer model writes a short answer constrained to the retrieved passages, citing them inline as `[1]`, `[2]`, …
5. **Render** (`src/views/ask-docs.tsx`): the view shows the answer with clickable citation chips, expandable source-passage previews, and a follow-up input.

## Getting Started

### Prerequisites

- Node.js 24+
- **OpenAI API key** (see step 2 below)

### Local Development

#### 1. Install

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

#### 2. Set up your OpenAI API key

This example uses the OpenAI API for embeddings and answer generation:

1. Create an API key on the [OpenAI platform](https://platform.openai.com/api-keys).
2. Create a `.env` file in the project root with your key. See `.env.example` for the format.

Optional environment overrides:

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENAI_ANSWER_MODEL` | `gpt-5-mini` | Model that writes the cited answer |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Model used to embed chunks and questions |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Point at a compatible proxy or gateway |

#### 3. Start your local server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

This command starts:

- Your MCP server at `http://localhost:3000/mcp`.
- Skybridge DevTools UI at `http://localhost:3000/`.

Try asking: _"How do I call a tool from a view?"_ or _"What does data-llm do?"_

The first question triggers the docs ingestion and embedding, so it takes a few extra seconds; later questions reuse the cached index.

#### 4. Project structure

```
├── src/
│   ├── server.ts          # MCP server: the ask-docs tool
│   ├── env.ts             # Loads .env
│   ├── helpers.ts         # Typed hooks inferred from the server
│   ├── index.css          # Global styles
│   ├── rag/
│   │   ├── corpus.ts      # Fetch llms.txt + page markdown, chunk by section
│   │   ├── retrieval.ts   # Embedding index + cosine top-k search
│   │   ├── answer.ts      # Cited answer generation
│   │   └── openai.ts      # Minimal fetch-based OpenAI client
│   └── views/
│       └── ask-docs.tsx   # Cited answer + source previews + follow-up input
├── .env.example           # OpenAI API key template
├── alpic.json             # Deployment config
└── package.json
```

### Testing your App

You can test your App locally by using our DevTools UI on `http://localhost:3000` while running the dev command.

To test your app with other MCP Clients like ChatGPT, Claude or VSCode, see [Testing Your App](https://docs.skybridge.tech/quickstart/test-your-app).

## Adapting This Example to Your Own Docs

The pipeline is corpus-agnostic: any Mintlify-hosted docs expose the same `llms.txt` + per-page `.md` endpoints, so pointing `DOCS_INDEX_URL` in `src/rag/corpus.ts` at another docs site is usually enough. For other corpora, replace `loadCorpus()` with anything that returns `DocChunk`s (markdown files on disk, a CMS export, a sitemap crawl…) and the retrieval, generation, and view layers keep working unchanged.

## Deploy to Production

Skybridge is infrastructure vendor agnostic, and your app can be deployed on any cloud platform supporting MCP.

The simplest way to deploy your App in minutes is [Alpic](https://alpic.ai/).

1. Create an account on [Alpic platform](https://app.alpic.ai/).
2. Connect your GitHub repository to automatically deploy at each commit.
3. Use your remote App URL to connect it to MCP Clients, or use the Alpic Playground to easily test your App.

[![Deploy it on Alpic](https://assets.alpic.ai/button.svg)](https://app.alpic.ai/new/clone?repositoryUrl=https://github.com/alpic-ai/skybridge&rootDir=examples/docs-qa)

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Alpic Documentation](https://docs.alpic.ai/)

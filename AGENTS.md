# Agents Guide

## What is Skybridge

Skybridge is a fullstack TypeScript framework for building **ChatGPT Apps** and **MCP Apps** — interactive React widgets that render inside AI conversations (ChatGPT, Claude, Goose, VSCode, etc.).

It wraps two low-level runtimes behind a unified set of React hooks:

- **Apps SDK** (ChatGPT only): proprietary `window.openai` API. Widgets run in an iframe, hydrated with tool output.
- **MCP Apps** (open standard): the `ext-apps` spec over JSON-RPC postMessage. Works with any MCP-compatible client.

Developers write one codebase. Skybridge's adaptor layer detects the runtime and bridges the hooks to the right protocol.

### Key primitives

| Side | What you use | Purpose |
|------|-------------|---------|
| Server (`skybridge/server`) | `McpServer`, `registerWidget()`, `registerTool()` | Define tools and widgets. Returns `{ content, structuredContent, _meta }` |
| Client (`skybridge/web`) | `useToolInfo()`, `useCallTool()`, `useWidgetState()`, `data-llm`, `createStore()` | Consume tool data, trigger actions, sync state to the model |
| Build (`skybridge/web`) | `skybridge()` Vite plugin, `mountWidget()` | HMR, widget transformation, entry point mounting |

### Data flow

1. Host calls MCP tool -> server returns `structuredContent` + `_meta`
2. Widget hydrates via `useToolInfo()`
3. User interacts -> widget updates `data-llm` attributes -> model sees context
4. Widget triggers server action via `useCallTool()` or prompts model via `useSendFollowUpMessage()`

## Monorepo layout

```
packages/
  core/           # The `skybridge` npm package — server, web, CLI, Vite plugin
    src/server/   #   McpServer, Express, widget registration
    src/web/      #   React hooks, bridges, data-llm, Vite plugin, createStore
    src/cli/      #   oclif CLI (skybridge dev/build/start)
    src/commands/ #   CLI command implementations
  devtools/       # @skybridge/devtools — browser DevTools emulator (React + Tailwind + Vite)
  create-skybridge/ # `npm create skybridge` scaffolding CLI

examples/         # 8 showcase apps (capitals, ecom-carousel, everything, productivity, manifest-ui, auth, investigation-game, times-up)

docs/             # Mintlify docs site (docs.skybridge.tech)
  fundamentals/   #   Apps SDK, MCP Apps explainers
  concepts/       #   Write-once-run-everywhere, data-flow, type-safety, etc.
  guides/         #   Fetching data, managing state, communicating with model
  api-reference/  #   Hook-by-hook reference with runtime compatibility matrix

skills/           # Claude agent skills for guided app building
  chatgpt-app-builder/  # ChatGPT-specific step-by-step references + evals
  mcp-app-builder/      # MCP Apps-specific references
  skybridge/            # General Skybridge skill
```

## Development

### Prerequisites

- Node.js >= 24.14.0
- pnpm 10+ (`corepack enable`)

### Setup

```bash
pnpm install
```

### Commands

| Scope | Command | What it does |
|-------|---------|-------------|
| All packages | `pnpm test` | Runs `test:unit` + `test:type` + `test:format` across packages |
| All packages | `pnpm build` | Builds all packages |
| All packages | `pnpm format` | Auto-fix lint + format via Biome |
| Single package | `pnpm --filter skybridge test` | Test only `packages/core` |
| Single package | `pnpm --filter @skybridge/devtools dev` | Dev server for devtools |
| Docs | `pnpm docs:dev` | Mintlify dev server |

### Validation before pushing

Run from root:

```bash
pnpm test          # unit tests (vitest) + type check (tsc --noEmit) + lint (biome ci)
pnpm build         # ensure everything compiles
```

For faster iteration on a single package:

```bash
pnpm --filter skybridge test:unit    # just vitest
pnpm --filter skybridge test:type    # just tsc
pnpm --filter skybridge test:format  # just biome
```

## Code rules

### Biome (lint + format)

Configured in root `biome.json`. Key rules:

- **Double quotes**, 2-space indent
- `noUnusedVariables`, `noUnusedImports`: error
- `noNonNullAssertion`: error — use proper narrowing instead
- `useBlockStatements`: error — always use braces
- `organizeImports`: auto-sorted on format

The `packages/core` biome config extends root and additionally enforces `useImportExtensions` with `.js` extensions (required for ESM output).

### TypeScript

- Strict mode everywhere
- No `any` — use proper types
- ESM-only (`"type": "module"` throughout)
- `packages/core` exports a shared `tsconfig.base.json` (`skybridge/tsconfig`)

## Cross-cutting concerns

When the public API of `packages/core/` changes:

1. Update `skills/chatgpt-app-builder/` and `skills/mcp-app-builder/` references to match
2. Update `docs/` — especially `api-reference/` and `guides/`
3. Keep examples working — run `pnpm build` from root to verify

When adding a new hook or changing hook behavior, update the runtime compatibility matrix in `docs/api-reference.mdx`.

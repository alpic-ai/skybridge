# Agents Guide

## What is Skybridge

Skybridge is a **fullstack TypeScript framework** for building ChatGPT Apps and MCP Apps — interactive React views that render inside AI conversations.

The core loop: an MCP server exposes tools. When the host (ChatGPT, Claude, VSCode…) calls a tool, the server returns structured data **and** a reference to a React view. The host renders that view in an iframe. The view can read tool output, call other tools, send follow-up messages, and sync UI state back to the model.

Skybridge wraps two host runtimes behind one API:
- **Apps SDK** — ChatGPT's proprietary `window.openai` runtime
- **MCP Apps** — the open `ext-apps` spec (JSON-RPC postMessage)

Developers write one server (backend) and view(s) (frontend). Skybridge detects the runtime at load time.

For deep understanding, read `docs/home.mdx`, `docs/fundamentals/`, and `docs/concepts/`.

## Monorepo layout

```
packages/
  core/             # npm: `skybridge` — the framework
    src/server/     #   MCP server (extends @modelcontextprotocol/sdk), view registration, Express
    src/web/        #   React hooks, runtime adaptors, data-llm, Vite plugin, createStore
    src/cli/        #   CLI entry (oclif)
    src/commands/   #   dev / build / start commands
  devtools/         # npm: @skybridge/devtools — local emulator UI
  create-skybridge/ # npm create skybridge — project scaffolder
 
examples/           # Showcase apps — good for understanding patterns
docs/               # Mintlify site (docs.skybridge.tech)
skills/             # Coding agents skills for guided app building
```

When you need to understand a concept, read the corresponding `docs/` page or the source in `packages/core/src/`.

## Development

**Prerequisites:** Node.js >= 24.14.0, pnpm 10+ (`corepack enable`).

```bash
pnpm install        # setup
```

### Validation

```bash
pnpm test           # unit tests (vitest) + lint (biome ci)
pnpm build          # compile all packages
```

Per-package:

```bash
pnpm --filter skybridge test:unit
pnpm --filter skybridge test:format
pnpm --filter skybridge build
```

Always run `pnpm test && pnpm build` from root before pushing.

## Code rules

**Biome** handles lint + format (see `biome.json`):
- Double quotes, 2-space indent, auto-sorted imports
- Errors on: unused variables/imports, non-null assertions, missing block braces

`packages/core/biome.json` extends root and enforces `.js` import extensions (ESM output).

**TypeScript**: strict mode, no `any`, ESM-only. See `packages/core/tsconfig.base.json`.

Run `pnpm format` to auto-fix.

## Cross-cutting concerns

When the public API of `packages/core/` changes (exports from `src/server/index.ts`, `src/web/index.ts`, and CLI commands in `src/commands/`):
1. Update `skills/` references (chatgpt-app-builder)
2. Update `docs/` — especially `api-reference/` and `guides/`

PR reviewers must enforce these updates are included when a PR touches the public API.

# Agents Guide

## What is Skybridge

Skybridge is a **fullstack TypeScript framework** for building ChatGPT Apps and MCP Apps — interactive React widgets that render inside AI conversations.

The core loop: an MCP server exposes tools. When the host (ChatGPT, Claude, Goose, VSCode…) calls a tool, the server returns structured data **and** a reference to a React widget. The host renders that widget in an iframe. The widget can read tool output, call other tools, send follow-up messages, and sync UI state back to the model — all over the MCP protocol.

Skybridge wraps two host runtimes behind one API:
- **Apps SDK** — ChatGPT's proprietary `window.openai` runtime
- **MCP Apps** — the open `ext-apps` spec (JSON-RPC postMessage)

Developers write one server + one widget. Skybridge detects the runtime at load time.

For deep understanding, read `docs/home.mdx`, `docs/fundamentals/`, and `docs/concepts/`.

## Monorepo layout

```
packages/
  core/             # npm: `skybridge` — the framework
    src/server/     #   MCP server (extends @modelcontextprotocol/sdk), widget registration, Express
    src/web/        #   React hooks, runtime adaptors, data-llm, Vite plugin, createStore
    src/cli/        #   CLI entry (oclif)
    src/commands/   #   dev / build / start commands
  devtools/         # npm: @skybridge/devtools — local emulator UI (Vite + React + Tailwind)
  create-skybridge/ # npm create skybridge — project scaffolder

examples/           # 8 showcase apps — good for understanding patterns
docs/               # Mintlify site (docs.skybridge.tech)
skills/             # Claude Code skills for guided app building
  chatgpt-app-builder/   # ChatGPT-specific references + evals
  mcp-app-builder/       # MCP Apps-specific references
  skybridge/             # General Skybridge skill
```

When you need to understand a concept, read the corresponding `docs/` page or the source in `packages/core/src/`.

## Development

**Prerequisites:** Node.js >= 24.14.0, pnpm 10+ (`corepack enable`).

```bash
pnpm install        # setup
```

### Validation

```bash
pnpm test           # unit tests (vitest) + typecheck (tsc --noEmit) + lint (biome ci)
pnpm build          # compile all packages
```

Per-package:

```bash
pnpm --filter skybridge test:unit
pnpm --filter skybridge test:type
pnpm --filter skybridge test:format
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

When the public API of `packages/core/` changes:
1. Update `skills/` references (chatgpt-app-builder, mcp-app-builder)
2. Update `docs/` — especially `api-reference/` and `guides/`
3. Run `pnpm build` from root to verify examples still compile

When adding/changing a hook, update the runtime compatibility matrix in `docs/api-reference.mdx`.

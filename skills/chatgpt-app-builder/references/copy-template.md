# Start From Template

Scaffold a project by setting up the Skybridge template starter. Skybridge is a TypeScript framework for building MCP servers with type-safe APIs and React widgets.

## Workflow

1. Ask: "Which package manager?" (npm / pnpm / yarn / bun / deno)

2. Run (do not `rm` beforehand—create handles conflicts):
```bash
{pm} create skybridge@latest {target-dir}

# deno
deno init --npm skybridge {target-dir}
```

3. [Start the dev server](run-locally.md). Read logs to assess readiness/health; fix any errors (TypeScript, etc.) before proceeding.

4. Start implementing your app using these core concepts:
- Server handlers and widget components → [fetch-and-render-data.md](fetch-and-render-data.md)
- Widget state and LLM context → [state-and-context.md](state-and-context.md)
- Display modes → [ui-guidelines.md](ui-guidelines.md)

5. Delete unused widgets files and leftover code.

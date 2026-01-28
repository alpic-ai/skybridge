# Bootstrap Workflow

Scaffold a project by setting up the Skybridge template starter. Skybridge is a TypeScript framework for building ChatGPT apps (MCP servers) with type-safe APIs and React widgets.

## Workflow

1. Infer `{app-name}` from SPEC.md title: extract business domain, kebab-case, strip "app"/"chatgpt"/"mcp" suffixes
   - "Pizza Ordering MCP App" → `pizza-ordering`
   - "Flight Tracker For ChatGPT" → `flight-tracker`

2. Ask: "Which package manager?" (npm / pnpm / yarn / bun / deno)

3. Run:
```bash
{pm} create skybridge@latest {app-name}

# deno
deno init --npm skybridge {app-name}
```

4. [Start the dev server](run-locally.md)

5. Replace the starter code with your implementation:
- Server handlers → [fetch-and-render-data.md](fetch-and-render-data.md)
- UI widgets → [manage-and-share-widget-state.md](communicate-with-llm.md)  

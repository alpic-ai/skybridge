# Generative UI

A Skybridge example that uses [json-render](https://github.com/vercel-labs/json-render) with `@json-render/shadcn` to let the LLM generate dynamic UIs on the fly.

## How it works

The MCP server exposes a `render` tool whose description includes the full json-render component catalog (36 shadcn/ui components). When the LLM needs to display a UI, it composes a json-render spec — a flat `{ root, elements }` JSON structure — and calls the tool. The widget renders the spec using `@json-render/react` with pre-built shadcn components.

```
User prompt → LLM generates json-render spec → render tool → Widget renders with shadcn/ui
```

## Running locally

```bash
npm install
npm run dev
```

## Example prompts

- "Show me a dashboard with revenue metrics for Q1 2025"
- "Create a user profile card for Jane Doe, senior engineer at Acme Corp"
- "Build a settings form with dark mode toggle, notification preferences, and a save button"

## Stack

- **Server**: Skybridge `McpServer` + `@json-render/core` catalog
- **Widget**: `@json-render/react` Renderer + `@json-render/shadcn` components
- **Styling**: Tailwind CSS v4 + shadcn/ui theme

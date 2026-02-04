---
name: mcp-app-builder
description: |
  Guide developers through creating MCP apps.
  Covers the full lifecycle: brainstorming ideas against UX guidelines, bootstrapping projects, implementing tools/widgets, debugging, running dev servers, deploying and connecting apps to ChatGPT.
  Use when a user wants to create or update a MCP app, MCP server or use the Skybridge framework.
---

# Creating MCP Apps

Those are conversational experiences that extend AI assistants through tools and custom UI widgets. They're built as MCP servers invoked during conversations.

⚠️ The app is consumed by two users at once: the **human** and the **AI Assistant LLM**. They collaborate through the widget—the human interacts with it, the LLM sees its state. Internalize this before writing code: the widget is your shared surface.

SPEC.md keeps track of the app's requirements and design decisions. Keep it up to date as you work on the app.

**No SPEC.md? Stop.** → Read [discover.md](references/discover.md) first. Nothing else until SPEC.md exists.

## Setup

1. **Copy template** → [copy-template.md](references/copy-template.md): when starting a new project with ready SPEC.md
2. **Run locally** → [run-locally.md](references/run-locally.md): when ready to test, need dev server or ChatGPT/Claude connection

## Architecture

Design or evolve UX flows and API shape → [architecture.md](references/architecture.md)

## Implementation

- **Fetch and render data** → [fetch-and-render-data.md](references/fetch-and-render-data.md): when implementing server handlers and widget data fetching
- **State and context** → [state-and-context.md](references/state-and-context.md): when persisting widget UI state and updating LLM context
- **Prompt LLM** → [prompt-llm.md](references/prompt-llm.md): when widget needs to trigger LLM response
- **UI guidelines** → [ui-guidelines.md](references/ui-guidelines.md): display modes, layout constraints, theme, device, and locale
- **External links** → [open-external-links.md](references/open-external-links.md): when redirecting to external URLs or setting "open in app" target
- **OAuth** → [oauth.md](references/oauth.md): when tools need user authentication to access user-specific data
- **CSP** → [csp.md](references/csp.md): when declaring allowed domains for fetch, assets, redirects, or iframes

## Deploy

- **Ship to production** → [deploy.md](references/deploy.md): when ready to deploy via Alpic
- **Publish to ChatGPT/Claude Directories** → [publish.md](references/publish.md): when ready to submit for review

Full API docs: [https://docs.skybridge.tech/api-reference.md](https://docs.skybridge.tech/api-reference.md)

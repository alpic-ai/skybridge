---
name: chatgpt-app-builder
description: |
  Guide developers through creating ChatGPT apps.
  Covers the full lifecycle: brainstorming ideas against UX guidelines, bootstrapping projects, implementing tools/widgets, debugging, running dev servers, deploying and connecting apps to ChatGPT.
  Use when a user wants to create or update a ChatGPT app / MCP server for ChatGPT, or use the Skybridge framework.
---

# Creating ChatGPT Apps

ChatGPT apps are conversational experiences that extend ChatGPT through tools and custom UI widgets. They're built as MCP servers invoked during conversations.

⚠️ The app is consumed by two users at once: the **human** and the **ChatGPT LLM**. They collaborate through the widget—the human interacts with it, the LLM sees its state. Internalize this before writing code: the widget is your shared surface.

SPEC.md keeps track of the app's requirements and design decisions. Keep it up to date as you work on the app.

## Setup

1. **Discover** → [discover.md](references/discover.md): when user has an idea but no SPEC.md yet
2. **Copy template** → [copy-template.md](references/copy-template.md): when starting a new project with ready SPEC.md
3. **Run locally** → [run-locally.md](references/run-locally.md): when ready to test, need dev server or ChatGPT connection

## Architecture

Design or evolve UX flows and API shape → [architecture.md](references/architecture.md)

## Implementation

- **Fetch and render data** → [fetch-and-render-data.md](references/fetch-and-render-data.md): when implementing server handlers and widget data fetching
- **State and context** → [state-and-context.md](references/state-and-context.md): when persisting widget UI state and updating LLM context
- **Prompt LLM** → [prompt-llm.md](references/prompt-llm.md): when widget needs to trigger LLM response
- **Style and localize** → [style-and-localize.md](references/style-and-localize.md): when adapting to theme, layout, locale, or device capabilities
- **Display modes** → [control-display-modes.md](references/control-display-modes.md): when switching between inline, PiP, fullscreen, or modal
- **External links** → [open-external-links.md](references/open-external-links.md): when redirecting to external URLs or setting "open in app" target


Full API docs: [https://docs.skybridge.tech/api-reference.md](https://docs.skybridge.tech/api-reference.md)
---
name: chatgpt-app-builder
description: |
  Guide developers through creating ChatGPT apps.
  Covers the full lifecycle: brainstorming ideas against UX guidelines, bootstrapping projects, implementing tools/widgets, debugging, running dev servers, deploying and connecting apps to ChatGPT.
  Use when a user wants to build a ChatGPT app, create an MCP server for ChatGPT.
---

# Creating ChatGPT Apps

ChatGPT apps are conversational experiences that extend ChatGPT through tools and custom UI widgets. They're built as MCP servers that ChatGPT invokes during conversations.

## Workflow

1. **Brainstorm**: validate the idea and create SPEC.md. See [references/brainstorm.md](references/brainstorm.md).
2. **Architecture**: specify tools and widgets, update SPEC.md. See [references/architecture.md](references/architecture.md).
3. **Bootstrap**: scaffold the project. See [references/bootstrap.md](references/bootstrap.md).
4. **Running locally**: start the dev server and guide user into connecting their local app to ChatGPT. See [references/run-locally.md](references/run-locally.md).
5. **Fetch and render data**: implement the tools and widgets. See [references/fetch-and-render-data.md](references/fetch-and-render-data.md).
6. **Communicate with host**: sync widget state and send message to LLM. See [references/communicate-with-host.md](references/communicate-with-host.md).

## API Reference
- [createStore](https://docs.skybridge.tech/api-reference/create-store)
- [data-llm](https://docs.skybridge.tech/api-reference/data-llm)
- [generateHelpers](https://docs.skybridge.tech/api-reference/generate-helpers)
- [MCP Server](https://docs.skybridge.tech/api-reference/mcp-server)
- [registerWidget](https://docs.skybridge.tech/api-reference/register-widget)
- [useCallTool](https://docs.skybridge.tech/api-reference/use-call-tool)
- [useSendFollowUpMessage](https://docs.skybridge.tech/api-reference/use-send-follow-up-message)
- [useToolInfo](https://docs.skybridge.tech/api-reference/use-tool-info)
- [useWidgetState](https://docs.skybridge.tech/api-reference/use-widget-state)

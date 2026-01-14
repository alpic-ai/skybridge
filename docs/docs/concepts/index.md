---
sidebar_position: 1
title: Core Concepts
---

# Core Concepts

:::info
We assume that you are already familiar with ChatGPT Apps and MCP Servers here. If you're not, read [MCP and ChatGPT Apps Fundamentals](/mcp-and-chatgpt-fundamentals) first.
:::

Four concepts power Skybridge:

| Concept | Purpose |
|---------|---------|
| [Data Flow](./data-flow) | How data moves between server, ChatGPT, and widget |
| [LLM Context Sync](./llm-context-sync) | Keep the model aware of widget state via `data-llm` |
| [Fast Iteration](./fast-iteration) | Local development with instant feedback |
| [Type Safety](./type-safety) | End-to-end TypeScript types from server to widget |

**Start with Data Flow** — it establishes the three-actor model that other concepts build on.

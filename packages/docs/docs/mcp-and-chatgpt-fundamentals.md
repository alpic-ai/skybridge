---
sidebar_position: 3
---

# MCP and ChatGPT Apps Fundamentals

To build effectively with Skybridge, you first need to understand the underlying technologies it builds upon:
- [Model Context Protocol](https://modelcontextprotocol.io) and MCP Servers
- the [OpenAI Apps SDK](https://developers.openai.com/apps-sdk/) to build ChatGPT Apps

:::note
Read our <a href="https://alpic.ai/blog/inside-openai-s-apps-sdk-how-to-build-interactive-chatgpt-apps-with-mcp?ref=makerswave.com" target="_blank" rel="noopener noreferrer">in-depth blog article</a> to understand how ChatGPT Apps work
:::

## MCP (Model Context Protocol)

[MCP](https://modelcontextprotocol.io) is an open standard that allows AI models to connect with external tools, resources, and services. Think of it as an API layer specifically designed for LLMs.

An MCP server exposes:
- **Tools**: Functions the model can call (e.g., `search_flights`, `get_weather`)
- **Resources**: Data the model can access (e.g., files, UI components)

When you ask ChatGPT a question, it can invoke tools on your MCP server to fetch data or perform actions on your behalf.

## ChatGPT Apps

ChatGPT Apps, [announced by OpenAI in October 2025](https://alpic.ai/blog/inside-openai-s-apps-sdk-how-to-build-interactive-chatgpt-apps-with-mcp?ref=makerswave.com), extend MCP with a powerful new capability: **interactive UI widgets** that render directly inside the conversation.

### How ChatGPT Apps Work

A ChatGPT App consists of two components:

1. **MCP Server**: Handles your business logic and exposes tools
2. **UI Widgets**: UI components that render in ChatGPT's interface

When a tool is called, it can return both:
- **Text content**: What the model sees and responds with
- **Widget content**: A visual UI that renders for the user

This creates a **dual-surface interaction model**: users interact with both the conversational interface (ChatGPT) and your custom UI (widget).

### The Widget Rendering Flow

Here's what happens when ChatGPT renders a widget:

1. User asks ChatGPT to perform an action (e.g., "Show me flight options to Paris")
2. ChatGPT calls your MCP tool (e.g., `search_flights`)
3. Your tool returns a result with data, and if the tool contains a reference to a UI resource, ChatGPT fetches the resource (your compiled React component) and renders it in an iframe, hydrated with your tool's `structuredContent` and `_meta` properties.

### The `window.openai` API

Widgets run inside an iframe and have access to a special [`window.openai`](https://developers.openai.com/apps-sdk/build/chatgpt-ui#understand-the-windowopenai-api) API that enables:

- **[`toolOutput`](https://developers.openai.com/apps-sdk/build/chatgpt-ui#understand-the-windowopenai-api)**: Access the initial data passed from your tool
- **[`widgetState`](https://developers.openai.com/apps-sdk/build/chatgpt-ui#persist-component-state-expose-context-to-chatgpt)**: Persist UI state across interactions
- **[`callTool()`](https://developers.openai.com/apps-sdk/build/chatgpt-ui#trigger-server-actions)**: Trigger additional tool calls from the UI
- **[`sendFollowUpMessage()`](https://developers.openai.com/apps-sdk/build/chatgpt-ui#send-conversational-follow-ups)**: Send messages back into the chat
- **[`setWidgetState()`](https://developers.openai.com/apps-sdk/build/chatgpt-ui#persist-component-state-expose-context-to-chatgpt)**: Update persistent state


This API is powerful but low-level and imperative—which is where Skybridge comes in.

## What Skybridge Adds

Skybridge is a modular ChatGPT Apps framework that bridges the gap between standard MCP servers and [OpenAI APIs](https://developers.openai.com/apps-sdk/reference/). It includes:

- **`skybridge/server`**: A drop-in replacement for the official MCP SDK that adds widget registration and type inference capabilities.
- **`skybridge/web`**: A React library providing hooks, components, and the runtime glue to render your widgets inside ChatGPT's iframe environment. 
- **Local Dev Environment**: A Vite plugin adds Hot Module Reload to your ChatGPT Apps, with optimized assets building for both local and production environments.

This lets you build rich, React-based UI experiences directly within ChatGPT conversations—all with full type safety and a developer experience you'll love.

**Next:** Learn how Skybridge extends these primitives in [Skybridge Core Concepts](/skybridge-core-concepts).




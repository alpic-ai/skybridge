---
sidebar_position: 3
---

# Core Concepts

Skybridge provides helpers and utilities to build ChatGPT Apps, which extend MCP Servers with UI resources. To build effectively with Skybridge, you will first need to be familiar with:
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
2. **Web Widgets**: UI components that render in ChatGPT's interface

When a tool is called, it can return both:
- **Text content**: What the model sees and responds with
- **Widget content**: A visual UI that renders for the user

This creates a **dual-surface interaction model**: users interact with both the conversational interface (ChatGPT) and your custom UI (widget).

### The Widget Rendering Flow

Here's what happens when ChatGPT renders a widget:

1. User asks ChatGPT to perform an action (e.g., "Show me flight options to Paris")
2. ChatGPT calls your MCP tool (e.g., `search_flights`)
3. Your tool returns data with a reference to a widget resource:
   ```ts
   {
     content: [{ type: "text", text: "Found 12 flights to Paris" }],
     _meta: { "openai/outputTemplate": "ui://widget/flight-results.html" }
   }
   ```
4. ChatGPT fetches the widget resource (your compiled React component)
5. The widget renders in an iframe, hydrated with your tool's `structuredContent`

### The `window.openai` API

Widgets run inside an iframe and have access to a special [`window.openai`](https://developers.openai.com/apps-sdk/build/chatgpt-ui#understand-the-windowopenai-api) API that enables:

- **[`toolOutput`](https://developers.openai.com/apps-sdk/build/chatgpt-ui#understand-the-windowopenai-api)**: Access the initial data passed from your tool
- **[`widgetState`](https://developers.openai.com/apps-sdk/build/chatgpt-ui#persist-component-state-expose-context-to-chatgpt)**: Persist UI state across interactions
- **[`callTool()`](https://developers.openai.com/apps-sdk/build/chatgpt-ui#trigger-server-actions)**: Trigger additional tool calls from the UI
- **[`sendFollowUpMessage()`](https://developers.openai.com/apps-sdk/build/chatgpt-ui#send-conversational-follow-ups)**: Send messages back into the chat
- **[`setWidgetState()`](https://developers.openai.com/apps-sdk/build/chatgpt-ui#persist-component-state-expose-context-to-chatgpt)**: Update persistent state


This API is powerful but low-level and imperative—which is where Skybridge comes in.

## What Skybridge Adds

Skybridge bridges the gap between raw MCP servers and ChatGPT Apps by providing:

### 1. Server Extensions

`skybridge/server` extends the official MCP SDK with:
- **Widget registration**: Simple API to register widgets, which are MCP tools with associated declared resources, saying you a lot of boilerplate code.
- **Type inference**: Export your server type for end-to-end TypeScript safety
- **Drop-in replacement**: Works with your existing MCP server code

### 2. React Abstractions

`skybridge/web` wraps the raw `window.openai` API with:
- **React hooks and utilities**: Modern, declarative alternatives to imperative API calls
- **Automatic state management**: No manual loading/error state tracking
- **Type safety**: Full autocomplete and type checking with `generateHelpers`

### 3. Development Tools

- **Vite plugin**: Optimized builds with HMR for instant feedback
- **Local dev server**: Test your widgets without constantly redeploying

In short: Skybridge takes the low-level primitives of MCP and ChatGPT Apps and wraps them in a modern, type-safe, React-friendly framework.

**Next:** Learn how Skybridge extends these primitives in [Skybridge Abstractions](/skybridge-abstractions).




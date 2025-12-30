---
sidebar_position: 3
---

# Use skybridge/web

This guide shows you how to use `skybridge/web` without `skybridge/server` to add React hooks and utilities to your widgets.

## Prerequisites

You should already have:
- A working ChatGPT app MCP server backend (in any technology)
- Node.js 22+

## Install

Add Skybridge to your project:

```bash
pnpm add skybridge
```

## Package overview

`skybridge/web` provides React hooks and utilities for building advanced ChatGPT Apps:

### State Management
- **[`useToolInfo`](/api-reference/use-tool-info)**: Get initial tool input, output and metadata
- **[`useWidgetState`](/api-reference/use-widget-state)**: Persist state across widget renders

### User Interface
- **[`useLayout`](/api-reference/use-layout)**: Get the current user layout and visual environment information
- **[`useDisplayMode`](/api-reference/use-display-mode)**: Get and request widget display mode changes
- **[`useRequestModal`](/api-reference/use-request-modal)**: Open a modal portaled outside of the widget iframe
- **[`useUser`](/api-reference/use-user)**: Get the session-stable user information (locale and userAgent)

### Actions
- **[`useCallTool`](/api-reference/use-call-tool)**: Call tools from within a widget
- **[`useOpenExternal`](/api-reference/use-open-external)**: Open external links
- **[`useSendFollowUpMessage`](/api-reference/use-send-follow-up-message)**: Send a follow-up message in the conversation
- **[`useFiles`](/api-reference/use-files)**: Upload and download files

### Others
- **[`useOpenAiGlobal`](/api-reference/use-openai-global)**: Low-level hook to subscribe to `window.openai` state values
- **[`generateHelpers`](/api-reference/generateHelpers)**: Generate typed helpers for your widgets (requires `skybridge/server`)

For complete documentation of all hooks with examples and options, see the [API Reference](/api-reference).

## Basic example

Here's a simple widget using Skybridge hooks:

```tsx
import { mountWidget, useToolInfo } from "skybridge/web";

const MyWidget: React.FC = () => {
  const toolInfo = useToolInfo();
  
  if (toolInfo.isPending) {
    return <div>Loading...</div>;
  }
  
  if (toolInfo.isSuccess) {
    return (
      <div>
        <h2>Results</h2>
        <pre>{JSON.stringify(toolInfo.output.structuredContent, null, 2)}</pre>
      </div>
    );
  }
  
  return <div>No results</div>;
};

mountWidget(<MyWidget />);
```

## Type safety without server

If you're not using `skybridge/server`, you won't get automatic type inference. You can still add types manually:

```tsx
import { useToolInfo } from "skybridge/web";

interface MyToolInput {
  query: string;
  limit?: number;
}

const MyWidget: React.FC = () => {
  const toolInfo = useToolInfo<MyToolInput>();
  
  // toolInfo.input is now typed as MyToolInput
  console.log(toolInfo.input.query);
  
  return <div>Widget content</div>;
};
```

## Learn more

To learn more about how to build a ChatGPT App, please read the Core Concepts and Iteraction Model sections below.

<div className="card-grid">
  <div className="card">
    <h3>MCP and ChatGPT Apps Fundamentals</h3>
    <p>Learn the fundamentals of MCP servers and ChatGPT Apps</p>
    <a href="/mcp-and-chatgpt-fundamentals" className="card-link">Learn More →</a>
  </div>
  
  <div className="card">
    <h3>Skybridge Core Concepts</h3>
    <p>Learn how Skybridge extends the raw APIs with React hooks</p>
    <a href="/skybridge-core-concepts" className="card-link">Explore →</a>
  </div>

  <div className="card">
    <h3>API Reference</h3>
    <p>Complete documentation of all hooks with examples and options</p>
    <a href="/api-reference" className="card-link">Browse API →</a>
  </div>
</div>

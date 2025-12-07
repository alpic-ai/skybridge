---
sidebar_position: 3
---

# Use skybridge/web

This guide shows you how to use `skybridge/web` without `skybridge/server` to add React hooks and utilities to your widgets.

## Prerequisites

You should already have:
- A working ChatGPT app MCP server backend (in any technology)
- A `web` folder or widgets directory in your project
- Node.js 22+ and pnpm installed

## Package overview

Skybridge provides React hooks for building advanced ChatGPT Apps.

### Core hooks
- **[`useToolInfo`](/api-reference/use-tool-info)**: Access the initial tool input and output data
- **[`useCallTool`](/api-reference/use-call-tool)**: Make additional tool calls from within your widget
- **[`useWidgetState`](/api-reference/use-widget-state)**: Manage widget state that persists across re-renders

### ChatGPT integration hooks
- **[`useSendFollowUpMessage`](/api-reference/use-send-follow-up-message)**: Send follow-up messages to the conversation
- **[`useRequestModal`](/api-reference/use-request-modal)**: Request a modal to display content
- **[`useOpenExternal`](/api-reference/use-open-external)**: Open external URLs

### ChatGPT environment hooks
- **[`useTheme`](/api-reference/use-theme)**: Access the current ChatGPT theme (light/dark)
- **[`useLocale`](/api-reference/use-locale)**: Access the user's locale
- **[`useDisplayMode`](/api-reference/use-display-mode)**: Access the current display mode
- **[`useUserAgent`](/api-reference/use-user-agent)**: Access the user agent string
- **[`useFiles`](/api-reference/use-files)**: Access uploaded files

### Advanced
- **[`useOpenAiGlobal`](/api-reference/use-openai-global)**: Access any global data from the OpenAI runtime
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

Since you're not using `skybridge/server`, you won't get automatic type inference. You can still add types manually:

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
    <h3>Core Concepts</h3>
    <p>Understand how ChatGPT Apps and widgets work</p>
    <a href="/concepts" className="card-link">Learn More →</a>
  </div>
  
  <div className="card">
    <h3>Skybridge Abstractions</h3>
    <p>Learn how Skybridge extends the raw APIs with React hooks</p>
    <a href="/skybridge-abstractions" className="card-link">Explore →</a>
  </div>

  <div className="card">
    <h3>API Reference</h3>
    <p>Complete documentation of all hooks with examples and options</p>
    <a href="/api-reference" className="card-link">Browse API →</a>
  </div>
</div>

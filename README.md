<div align="center">

# Skybridge

**Skybridge is the TypeScript framework for building ChatGPT apps**

[![By Alpic](https://img.shields.io/badge/Made%20by%20Alpic-f6ffed?logo=alpic)](https://alpic.ai)

![NPM Downloads](https://img.shields.io/npm/dm/skybridge?color=e90060)
![NPM Version](https://img.shields.io/npm/v/skybridge?color=e90060)
![GitHub License](https://img.shields.io/github/license/alpic-ai/skybridge?color=e90060)

</div>

Skybridge comes with 2 packages:

- `skybridge/server`: A drop-in replacement of the `@modelcontextprotocol/sdk` official `McpServer` class with extra features for widget development.
- `skybridge/web`: A react library with hooks and components to build widgets on the underlying _OpenAI iFrame skybridge_ runtime.

## Quick start

To get started in less than a minute, you can [create a new repository](https://github.com/new?template_name=apps-sdk-template&template_owner=alpic-ai) using our [ChatGPT SDK template](https://github.com/alpic-ai/apps-sdk-template). This template includes a basic setup for both the server and the widgets.

## Installation

```bash
pnpm add skybridge
```

## Concepts

### Widgets

> A widget is a UI component that turns structured tool results into a human-friendly UI. Those are built using React components. They are rendered inside an iframe inline with the conversation on ChatGPT.

Each widget in your app must have a unique name. The name is used to bridge the tool invocation result with the widget React component.

For example, in order to register a new widget named `pokemon` on your ChatGPT app. You should have the following file structure and file contents:

_Project structure_

```
server/
└── src/
    └── index.ts // Register the widget with McpServer.widget()
web/
└── src/
    └── widgets/
        └── pokemon.tsx // Use the same widget name as the file name
```

_server/src/index.ts_

```ts
import { McpServer } from "skybridge/server";

const server = new McpServer();

server.widget(
  "pokemon"
  // Remaining arguments...
);
```

_web/src/widgets/pokemon.tsx_

```ts
import { mountWidget } from "skybridge/web";

const Pokemon: React.FunctionComponent = () => {
  // Your React component code goes here...
};

mountWidget(<Pokemon />);
```

## Packages

### skybridge/server

The `skybridge/server` package is a drop-in replacement of the `@modelcontextprotocol/sdk` official `McpServer` class with extra features for widget development. If you're already using the `@modelcontextprotocol/sdk`, you can simply replace your `McpServer` import with `skybridge/server` and you're good to go.

### skybridge/web

The `skybridge/web` package is a react library with hooks and components to build widgets on the underlying _OpenAI iFrame skybridge_ runtime.

**Vite plugin**

The `skybridge/web` package comes with a Vite plugin that allows you to build your widgets as regular Vite apps.

```ts
import { defineConfig } from "vite";
import { skybridge } from "skybridge/web";

export default defineConfig({
  plugins: [skybridge()],
});
```

**Hooks**

The `skybridge/web` package comes with a set of hooks to help you build your widgets :

- `useOpenAiGlobal`: A generic hook to get any global data from the OpenAI iFrame skybridge runtime (in `window.openai`).
- `useToolOutput`: A hook to get the initial tool `structuredContent` returned when rendering the widget for the first time. The data inside this hook is not updated when the tool is called again.
- `useToolResponseMetadata`: A hook to get the initial tool `meta` returned when rendering the widget for the first time. The data inside this hook is not updated when the tool is called again.
- `useCallTool`: A @tanstack/react-query inspired hook to send make additional tool calls inside a widget.

_useOpenAiGlobal_

```ts
import { useOpenAiGlobal } from "skybridge/web";

const theme = useOpenAiGlobal("theme");
```

_useToolOutput_

```ts
import { useToolOutput } from "skybridge/web";

const toolOutput = useToolOutput();
```

_useToolResponseMetadata_

```ts
import { useToolResponseMetadata } from "skybridge/web";

const toolResponseMetadata = useToolResponseMetadata();
```

_useCallTool_ in synchronous mode

```ts
import { useCallTool } from "skybridge/web";

export const TestTool: React.FunctionComponent = () => {
  const { callTool, isPending } = useCallTool("myToolName");

  return (
    <div>
      <button
        disabled={isPending}
        onClick={() => {
          callTool({ input: "test input" }, {
            onSuccess: (data) => {
              alert("Tool returned: " + data);
            },
          });
      >
        Call Tool inside a widget
      </button>
    </div>
  );
};
```

_useCallTool_ in asynchronous mode

```ts
import { useCallTool } from "skybridge/web";

export const TestTool: React.FunctionComponent = () => {
  const { callToolAsync, isPending } = useCallTool("myToolName");

  return (
    <div>
      <button
        disabled={isPending}
        onClick={async () => {
          const data = await callToolAsync({ input: "test input" });
          alert("Tool returned: " + data);
        }}
      >
        Call Tool inside a widget
      </button>
    </div>
  );
};
```

## Migrate your existing MCP server to a ChatGPT app

If you're already using the `@modelcontextprotocol/sdk` to build a MCP server, you can migrate to a ChatGPT app by following these steps:

1. Replace your `McpServer` import from `@modelcontextprotocol/sdk` with the same import from `skybridge/server`
2. Create a new vite project in a folder named `web` and install the `skybridge` package
3. Replace the `vite.config.ts` file with the following:

```ts
import { defineConfig } from "vite";
import { skybridge } from "skybridge/web";

export default defineConfig({
  plugins: [skybridge()],
});
```

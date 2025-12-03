---
sidebar_position: 1
---

# Introduction

**Skybridge is the TypeScript framework for building ChatGPT apps**
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

Check out the [API reference](/docs/api-reference) for the full list of hooks and components.

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

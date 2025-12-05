<div align="center">

# Skybridge

**Skybridge is the TypeScript framework for building ChatGPT apps**

[![By Alpic](https://img.shields.io/badge/Made%20by%20Alpic-f6ffed?logo=alpic)](https://alpic.ai)

![NPM Downloads](https://img.shields.io/npm/dm/skybridge?color=e90060)
![NPM Version](https://img.shields.io/npm/v/skybridge?color=e90060)
![GitHub License](https://img.shields.io/github/license/alpic-ai/skybridge?color=e90060)

</div>

Skybridge is a fullstack library. It comes with modular packages aiming at simplifying the development of ChatGPT apps:

- HMR server for development and build pipeline for production including end-to-end (tools-to-widget) type safety
- collection of React hooks for state management, async data fetching
- attribute for widget-to-context synchronization

### <a href="https://skybridge.tech">Read the docs →</b></a>

## Get Involved

We welcome issues and pull requests!</br>
Participate in [GitHub discussions](https://github.com/alpic-ai/skybridge/discussions)</br>
Chat with the community on [Discord](https://discord.com/invite/gNAazGueab)</br>
See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions

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

**Typed Hooks**

Skybridge provides fully typed hooks that give you autocomplete for tool names and type inference for inputs/outputs - similar to tRPC. This is opt-in and requires exporting your server type.

> **Tip:** For the best TypeScript experience, use typed hooks throughout your application. They provide autocomplete, type safety, and better IDE support.

> **Important:** For `generateHelpers` to work correctly, your MCP server must be defined using method chaining (e.g., `server.widget(...).widget(...).registerTool(...)`). This ensures TypeScript can properly infer the tool registry type from the chained calls.

**Examples:**

✅ **Works** - Using method chaining:

```ts
import { McpServer } from "skybridge/server";
import { z } from "zod";

const server = new McpServer({ name: "my-app", version: "1.0" }, {})
  .widget(
    "search-voyage",
    {},
    {
      inputSchema: { destination: z.string() },
    },
    async ({ destination }) => {
      return {
        content: [{ type: "text", text: `Found trips to ${destination}` }],
      };
    }
  )
  .registerTool(
    "calculate-price",
    {
      inputSchema: { tripId: z.string() },
    },
    async ({ tripId }) => {
      return { content: [{ type: "text", text: `Price for ${tripId}` }] };
    }
  );

export type AppType = typeof server; // ✅ Type inference works correctly
```

❌ **Doesn't work** - Without method chaining:

```ts
import { McpServer } from "skybridge/server";
import { z } from "zod";

const server = new McpServer({ name: "my-app", version: "1.0" }, {});

server.widget(
  "search-voyage",
  {},
  {
    inputSchema: { destination: z.string() },
  },
  async ({ destination }) => {
    return {
      content: [{ type: "text", text: `Found trips to ${destination}` }],
    };
  }
);

server.registerTool(
  "calculate-price",
  {
    inputSchema: { tripId: z.string() },
  },
  async ({ tripId }) => {
    return { content: [{ type: "text", text: `Price for ${tripId}` }] };
  }
);

export type AppType = typeof server; // ❌ Type inference fails - tool registry is empty
```

_Server setup (server/src/index.ts)_

```ts
import { McpServer } from "skybridge/server";
import { z } from "zod";

const server = new McpServer({ name: "my-app", version: "1.0" }, {})
  .widget(
    "search-voyage",
    {},
    {
      description: "Search for trips",
      inputSchema: {
        destination: z.string(),
        departureDate: z.string().optional(),
      },
      outputSchema: {
        results: z.array(z.object({ id: z.string(), name: z.string() })),
        totalCount: z.number(),
      },
    },
    async ({ destination }) => {
      // Your tool logic here...
      return {
        content: [{ type: "text", text: `Found trips to ${destination}` }],
      };
    }
  )
  .widget(
    "get-details",
    {},
    {
      inputSchema: { tripId: z.string() },
    },
    async ({ tripId }) => {
      return { content: [{ type: "text", text: `Details for ${tripId}` }] };
    }
  );

// Export the server type for the client
export type AppType = typeof server;
```

_One-time setup (web/src/skybridge.ts)_

Create typed hooks once and export them for use across your app. This file acts as a bridge between your server types and your widgets:

```ts
import type { AppType } from "../server"; // type-only import
import { generateHelpers } from "skybridge/web";

export const { useCallTool, useToolInfo } = generateHelpers<AppType>();
```

_Usage in widgets (web/src/widgets/search.tsx)_

```tsx
import { useCallTool, useToolInfo } from "../skybridge"; // import typed hooks

export function SearchWidget() {
  const { callTool, data, isPending } = useCallTool("search-voyage");
  //                                                 ^ autocomplete for tool names
  const toolInfo = useToolInfo<"search-voyage">();
  //                              ^ autocomplete for widget names

  const handleSearch = () => {
    callTool({ destination: "Spain" });
    //         ^ autocomplete for input fields
  };

  return (
    <div>
      <button onClick={handleSearch} disabled={isPending}>
        Search
      </button>
      {toolInfo.isSuccess && (
        <div>Found {toolInfo.output.structuredContent.totalCount} results</div>
        //                      ^ typed output
      )}
    </div>
  );
}
```

**Hooks**

The `skybridge/web` package comes with a set of hooks to help you build your widgets :

- `useOpenAiGlobal`: A generic hook to get any global data from the OpenAI iFrame skybridge runtime (in `window.openai`).
- `useToolOutput`: A hook to get the initial tool `structuredContent` returned when rendering the widget for the first time. The data inside this hook is not updated when the tool is called again.
- `useToolResponseMetadata`: A hook to get the initial tool `meta` returned when rendering the widget for the first time. The data inside this hook is not updated when the tool is called again.
- `useToolInfo`: A hook to get the tool input, output, and response metadata with type inference. Provides a discriminated union based on status (pending/success).
- `useCallTool`: A @tanstack/react-query inspired hook to send make additional tool calls inside a widget.
- `generateHelpers`: A factory that creates typed versions of `useCallTool` and `useToolInfo` with full type inference from your server type.

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

_useToolInfo_

```ts
import { useToolInfo } from "skybridge/web";

const toolInfo = useToolInfo<{
  input: { query: string };
  output: { results: string[] };
  responseMetadata: { id: number };
}>();

// toolInfo.input is typed based on the input type
// toolInfo.output.structuredContent is typed based on the output type (undefined when pending)
// toolInfo.status narrows correctly: "pending" | "success"

if (toolInfo.isPending) {
  // toolInfo.output is undefined here (pending state)
  console.log(toolInfo.input.query);
}

if (toolInfo.isSuccess) {
  // toolInfo.output.structuredContent is typed here
  console.log(toolInfo.output.structuredContent.results);
}
```

_useToolInfo_ with typed hooks (recommended)

```tsx
import { useToolInfo } from "../skybridge"; // import typed hooks

export function SearchWidget() {
  const toolInfo = useToolInfo<"search-voyage">();
  //                              ^ autocomplete for widget names
  // toolInfo.input is typed as { destination: string; departureDate?: string; ... }
  // toolInfo.output.structuredContent is typed as { results: Array<...>; totalCount: number; }

  if (toolInfo.isSuccess) {
    return (
      <div>Found {toolInfo.output.structuredContent.totalCount} results</div>
    );
  }

  return <div>Searching for {toolInfo.input.destination}...</div>;
}
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

**State Management**

The `skybridge/web` package provides `createStore` for creating Zustand stores with automatic persistence to `window.openai.widgetState`. This is useful when you need more advanced state management than what `useWidgetState` provides.

_createStore_

```ts
import { createStore } from "skybridge/web";

type CounterState = {
  count: number;
  increment: () => void;
  decrement: () => void;
};

const useCounterStore = createStore<CounterState>(
  (set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
    decrement: () => set((state) => ({ count: state.count - 1 })),
  }),
  { count: 0 } // Optional default state
);

// Use in your component
function CounterWidget() {
  const { count, increment, decrement } = useCounterStore();

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
    </div>
  );
}
```

The `createStore` function:

- Automatically persists state to `window.openai.widgetState`
- Syncs with external state changes from the host
- Only serializes state data, not methods

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

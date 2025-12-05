---
sidebar_position: 2
---

# generateHelpers

`generateHelpers` is a factory function that creates fully typed versions of `useCallTool` and `useToolInfo` hooks with end-to-end type inference from your MCP server definition. Inspired by [TRPC](https://trpc.io) and [Hono](https://hono.dev), it provides a type-safe, developer-friendly API that eliminates the need for manual type annotations.

## Why generateHelpers?

If you're familiar with TRPC or Hono, `generateHelpers` provides a similar developer experience:

- **Full type inference**: Tool names, inputs, and outputs are automatically inferred from your server
- **Autocomplete**: Get IntelliSense suggestions for all available tools
- **Type safety**: Catch errors at compile time, not runtime

Instead of manually typing each hook call:

```tsx
// ❌ Without generateHelpers - manual type annotations required
const { callTool } = useCallTool<{ destination: string }, { structuredContent: { results: string[] } }>("search-voyage");
```

You get automatic type inference:

```tsx
// ✅ With generateHelpers - fully typed, zero annotations needed
const { callTool } = useCallTool("search-voyage");
// TypeScript knows everything: tool name, input shape, output shape
```

## Prerequisites

### Server Must Use Method Chaining

For `generateHelpers` to work correctly, your MCP server **must** be defined using method chaining. This ensures TypeScript can properly infer the tool registry type.

✅ **Works** - Using method chaining:

```ts
import { McpServer } from "skybridge/server";
import { z } from "zod";

const server = new McpServer({ name: "my-app", version: "1.0" }, {})
  .widget("search-voyage", {}, {
    inputSchema: { destination: z.string() },
  }, async ({ destination }) => {
    return { content: [{ type: "text", text: `Found trips to ${destination}` }] };
  })
  .registerTool("calculate-price", {
    inputSchema: { tripId: z.string() },
  }, async ({ tripId }) => {
    return { content: [{ type: "text", text: `Price for ${tripId}` }] };
  });

export type AppType = typeof server; // ✅ Type inference works correctly
```

❌ **Doesn't work** - Without method chaining:

```ts
import { McpServer } from "skybridge/server";
import { z } from "zod";

const server = new McpServer({ name: "my-app", version: "1.0" }, {});

server.widget("search-voyage", {}, {
  inputSchema: { destination: z.string() },
}, async ({ destination }) => {
  return { content: [{ type: "text", text: `Found trips to ${destination}` }] };
});

server.registerTool("calculate-price", {
  inputSchema: { tripId: z.string() },
}, async ({ tripId }) => {
  return { content: [{ type: "text", text: `Price for ${tripId}` }] };
});

export type AppType = typeof server; // ❌ Type inference fails - tool registry is empty
```

### Export Server Type

Export your server type so it can be imported in your web code:

```ts
// server/src/index.ts
export type AppType = typeof server;
```

## Quick Start

### 1. One-Time Setup

Create a bridge file that connects your server types to your widgets:

```ts
// web/src/skybridge.ts
import type { AppType } from "../server"; // type-only import
import { generateHelpers } from "skybridge/web";

export const { useCallTool, useToolInfo } = generateHelpers<AppType>();
```

### 2. Use Typed Hooks in Widgets

Import and use the typed hooks throughout your app:

```tsx
// web/src/widgets/search.tsx
import { useCallTool, useToolInfo } from "../skybridge";

export function SearchWidget() {
  const { callTool, data, isPending } = useCallTool("search-voyage");
  //                                      ^ autocomplete for tool names
  
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

## API Reference

```tsx
const { useCallTool, useToolInfo } = generateHelpers<T>();
```

## Type Parameters

### `T`

```tsx
T extends McpServer<AnyToolRegistry>
```

**Required**

The type of your MCP server instance. Use `typeof server` to get the type:

The server type must be defined using method chaining for type inference to work correctly. See [Prerequisites](#prerequisites) for more details.

## Returns

An object containing typed versions of `useCallTool` and `useToolInfo` hooks:

### `useCallTool`

A typed version of the [`useCallTool`](./useCallTool.md) hook that provides autocomplete for tool names and full type inference for inputs and outputs.

```tsx
const {
  data,
  error,
  isError,
  isIdle,
  isPending,
  isSuccess,
  status,
  callTool,
  callToolAsync,
} = useCallTool<K extends Names>(name);
```

#### `name`

```tsx
name: K extends Names
```

**Required**

The name of the tool to call. This must match a tool name from your server's registry. TypeScript will provide autocomplete suggestions based on all registered tools and widgets.

#### Return Value

The typed `useCallTool` returns the same structure as the untyped version, but with automatically inferred types. See the [`useCallTool` API reference](./useCallTool.md) for detailed documentation on all return properties.

### `useToolInfo`

A typed version of the `useToolInfo` hook that provides autocomplete for tool names and full type inference for inputs, outputs, and response metadata.

```tsx
const toolInfo = useToolInfo<K extends Names>();
```

#### Type Parameter `K`

```tsx
K extends Names
```

**Required**

The name of the tool/widget. This must match a tool name from your server's registry. TypeScript will provide autocomplete suggestions based on all registered tools and widgets.

## Limitations

- **Chaining Required**: Server must use method chaining for type inference to work
- **Runtime Types**: Types are inferred at compile time; runtime validation still uses Zod schemas
- **Callback Return Type**: Output types are inferred from the callback's return value, not `outputSchema`

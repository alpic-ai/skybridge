---
sidebar_position: 2
---

# Use skybridge/server

This guide shows you how to add `skybridge/server` to an existing MCP server to enable widget support with full TypeScript type inference.

## Prerequisites

You should already have:
- A working MCP server using the official [TypeScript MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Node.js 22+ and pnpm installed

## Install Skybridge

```bash
pnpm add skybridge
```

## Update your server

Replace your `McpServer` import with Skybridge's enhanced version:

```typescript
// Before
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// After
import { McpServer } from "skybridge/server";
```

Your existing tools, resources, and prompts will continue to work as before. But now, you will also be able to create widgets.

## Widget structure

Skybridge follows a file-based convention for organizing widgets. Here's the recommended project structure:

```
your-project/
├── server/
│   └── src/
│       └── index.ts          # Your MCP server with widget registration
└── web/
    └── src/
        └── widgets/
            ├── my-widget.tsx  # Widget component
            └── other-widget.tsx
```

### Widget naming convention

**Important:** The widget file name must match the widget name you register on the server.

For example:
- If you create `web/src/widgets/search-results.tsx`
- You must register it as `search-results` on the server
- This allows Skybridge to automatically map tool calls to widget components

## Set up the web project

Create a `web` folder for your UI widgets:

```bash
mkdir web && cd web
pnpm init
pnpm add react react-dom skybridge
pnpm add -D vite typescript @types/react @types/react-dom
```

### Configure Vite

Create `vite.config.ts` in the `web` folder:

```typescript
import { defineConfig } from "vite";
import { skybridge } from "skybridge/web";

export default defineConfig({
  plugins: [skybridge()],
});
```

## Create your first widget

Create a widget file in `web/src/widgets/my-widget.tsx`:

```tsx
import { mountWidget } from "skybridge/web";

const MyWidget: React.FC = () => {
  return (
    <div>
      <h2>Hello from Skybridge!</h2>
      <p>Your widget is working!</p>
    </div>
  );
};

mountWidget(<MyWidget />);
```

## Register the widget

In your server code, register the widget using `server.widget()`:

```typescript
import { McpServer } from "skybridge/server";

const server = new McpServer({ name: "my-app", version: "1.0" }, {});

server.widget(
  "my-widget",  // Must match the filename: my-widget.tsx
  {},
  {
    description: "My first widget",
    inputSchema: {
      message: { type: "string" },
    },
  },
  async ({ message }) => {
    // Your widget logic here
    return { 
      content: [{ 
        type: "text", 
        text: message || "Hello World"
      }] 
    };
  }
);
```

## Configure your dev server

Update your server startup to serve the MCP endpoint. If you're using Express:

```typescript
import { McpServer } from "skybridge/server";
import express from "express";

const app = express();
const server = new McpServer({ name: "my-app", version: "1.0" }, {});

// Register your widgets
server.widget("my-widget", {}, {
  inputSchema: { message: { type: "string" } },
}, async ({ message }) => {
  return { 
    content: [{ type: "text", text: message }] 
  };
});

// Serve the MCP endpoint
app.use("/mcp", server.handler());

// Start the server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

## Advanced: Full type safety with TypeScript

For full type inference and autocomplete in your widgets, follow these additional steps.

### Use method chaining

**Important:** Use method chaining when registering widgets to enable TypeScript type inference:

```typescript
import { McpServer } from "skybridge/server";
import { z } from "zod";

// ✅ Good - Using method chaining
const server = new McpServer({ name: "my-app", version: "1.0" }, {})
  .widget("search-results", {}, {
    inputSchema: {
      query: z.string(),
    },
    outputSchema: {
      results: z.array(z.object({ id: z.string(), title: z.string() })),
      totalCount: z.number(),
    },
  }, async ({ query }) => {
    return { content: [{ type: "text", text: `Found results for ${query}` }] };
  })
  .widget("get-details", {}, {
    inputSchema: { itemId: z.string() },
  }, async ({ itemId }) => {
    return { content: [{ type: "text", text: `Details for ${itemId}` }] };
  });

// Export the server type
export type AppType = typeof server;
```

```typescript
// ❌ Bad - Without method chaining
const server = new McpServer({ name: "my-app", version: "1.0" }, {});

server.widget("search-results", {}, { /* ... */ }, async () => { /* ... */ });
server.widget("get-details", {}, { /* ... */ }, async () => { /* ... */ });

export type AppType = typeof server; // Type inference fails
```

### Generate typed helpers

Create a one-time setup file to get fully typed hooks with autocomplete.

Create `web/src/skybridge.ts`:

```typescript
import type { AppType } from "../../server/src/index"; // type-only import
import { generateHelpers } from "skybridge/web";

export const { useCallTool, useToolInfo } = generateHelpers<AppType>();
```

### Use typed hooks in widgets

Now you can use these typed hooks in your widgets with full autocomplete:

```tsx
import { useCallTool, useToolInfo } from "../skybridge";

export function SearchWidget() {
  const { callTool, data, isPending } = useCallTool("search-results");
  //                                                 ^ autocomplete for widget names
  
  const toolInfo = useToolInfo<"search-results">();
  //                              ^ autocomplete for widget names

  const handleSearch = () => {
    callTool({ query: "TypeScript" });
    //         ^ autocomplete for input fields
  };

  if (toolInfo.isSuccess) {
    return (
      <div>
        <button onClick={handleSearch} disabled={isPending}>
          Search
        </button>
        <div>Found {toolInfo.output.structuredContent.totalCount} results</div>
        {/*                                         ^ typed output */}
      </div>
    );
  }

  return <div>Searching for {toolInfo.input.query}...</div>;
  {/*                                    ^ typed input */}
}
```

### Benefits of typed hooks

With this setup, you get:
- Autocomplete for widget names
- Autocomplete for input field names


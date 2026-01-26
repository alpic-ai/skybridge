# Bootstrap Workflow

Scaffold a Skybridge project and generate stub code for the architecture. Skybridge is a TypeScript framework for building ChatGPT apps (MCP servers) with type-safe APIs and React widgets.

## Skybridge Project Structure

```
my-app/
├── server/src/
│   └── index.ts          # McpServer with registerWidget/registerTool
├── web/src/
│   ├── widgets/          # React components (filename = widget name)
│   │   └── search-flights.tsx
│   ├── index.css         # Global CSS
│   └── helpers.ts        # Type-safe hooks via generateHelpers
└── package.json
```

**Naming convention**: Widget filename must match registered name using kebab-case.
`search_flights` → register as `search-flights` → file `search-flights.tsx`

## Step 1: Check for Existing Project

Search for `package.json` with `skybridge` in dependencies.

- **If found**: Skip to Step 3 (update routes only)
- **If not found**: Continue to Step 2

## Step 2: Scaffold New Project

1. Infer `{app-name}` from SPEC.md title: extract business domain only, kebab-case, strip suffixes like "app", "chatgpt", "mcp" (e.g., "Pizza Ordering MCP App" → `pizza-ordering`, "Flight Tracker For ChatGPT" → `flight-tracker`)
2. Ask the user: "Which package manager do you use?" (npm / pnpm / yarn / bun / deno)

Run:
```bash
{pm} create skybridge@latest {app-name}

# deno
deno init --npm skybridge {app-name}
```

## Step 3: Update Tools and Widgets

Generate **placeholder code** that compiles and runs. No business logic—just TODO comments where implementation goes.
Keep mocks simple, use empty collections.

**Limits:** Server handlers ≤5 lines. React components ≤10 lines. No loops, no event handlers, no tool calls.

### Server: `server/src/index.ts`

Register widgets and tools with minimal mock handlers:

```typescript
import { McpServer } from "skybridge/server";
import { z } from "zod";

const server = new McpServer({ name: "{app-name}", version: "1.0" }, {})
  .registerWidget(
    "search-flights",
    { description: "Search for flights" },
    {
      inputSchema: { destination: z.string(), dates: z.string(),},
    },
    async ({ destination, dates }) => {
      // TODO: Implement
      const structuredContent = { flights: [] };
      return {
        structuredContent,
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
      };
    }
  )
  .registerTool(
    "create-checkout",
    {
      description: "Create checkout session",
      inputSchema: { flightId: z.string() },
    },
    async ({ flightId }) => {
      // TODO: Implement
      const structuredContent = { checkoutUrl: "" };
      return {
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
      };
    }
  );

export default server;
export type AppType = typeof server;
```

### Web: `web/src/widgets/{widget-name}.tsx`

One file per widget, filename matches registered name:

```tsx
import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers";

function SearchFlights() {
  const { input, output, isPending } = useToolInfo<"search-flights">();
  if (isPending) return <div>Loading...</div>;
  // TODO: Display flight results
  return <div>Flights to {input.destination}: {output?.flights?.length ?? 0} found</div>;
}

mountWidget(<SearchFlights />);
```

### Web: `web/src/index.css`

Basic reset only—do not add component styles:

```css
*, *::before, *::after { box-sizing: border-box; }
body { font-family: system-ui, sans-serif; padding: 1rem; }
```

## Step 4: Update SPEC.md with Architecture

Update SPEC.md with the project structure, then ask for permission to [run the app locally](run-locally.md).

````markdown
...

### Project Structure
```tree
my-app/
├── server/src/
│   └── index.ts
└── web/src/
    └── widgets/
        └── search-flights.tsx
```
````
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

For each widget/tool in the architecture, generate **stub code only**.

**Simple placeholders only - no implementation:**
- Server handlers: return empty/mock data matching the output schema
- React components: basic UI skeleton showing input/output
- Do NOT write business logic, API calls, or data fetching
- Do NOT add error handling, validation, or edge cases
- Implement the bare minimum boilerplate so the app can run

### Server: `server/src/index.ts`

Register widgets and tools:

```typescript
import { McpServer } from "skybridge/server";
import { z } from "zod";

const server = new McpServer({ name: "{app-name}", version: "1.0" }, {})
  // Widgets
  .registerWidget(
    "search-flights",
    { description: "Search for flights" },
    {
      inputSchema: {
        destination: z.string(),
        dates: z.string(),
      },
    },
    async ({ destination, dates }) => {
      // TODO: Implement
      const structuredContent = { flights: [{ id: "123", price: 100, airline: "Air France" }] };
      return {
        structuredContent,
        content: [{ type: "text", text: JSON.stringify(structuredContent) }],
      };
    }
  )
  // Tools
  .registerTool(
    "create-checkout",
    {
      description: "Create checkout session",
      inputSchema: {
        flightId: z.string(),
        passengers: z.array(z.object({ name: z.string() })),
      },
    },
    async ({ flightId, passengers }) => {
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

### Web: `web/src/helpers.ts`

```typescript
import { generateHelpers } from "skybridge/web";
import type { AppType } from "../../server/src/index";

export const { useToolInfo, useCallTool } = generateHelpers<AppType>();
```

### Web: `web/src/widgets/{widget-name}.tsx`

One file per widget, filename matches registered name:

```tsx
import { mountWidget } from "skybridge/web";
import { useToolInfo, useCallTool } from "../helpers";

function SearchFlights() {
  const { input, output, isPending, isSuccess } = useToolInfo<"search-flights">();
  const { callTool } = useCallTool("create-checkout");

  if (isPending) {
    return <div>Searching flights to {input.destination}...</div>;
  }

  const flights = output?.flights || [];

  return (
    <div>
      <h2>Flights to {input.destination}</h2>
      {flights.map((flight) => (
        <div key={flight.id}>
          {flight.airline} - ${flight.price}
          <button onClick={() => callTool({ flightId: flight.id, passengers: [] })}>
            Book
          </button>
        </div>
      ))}
    </div>
  );
}

mountWidget(<SearchFlights />);
```

### Web: `web/src/index.css`

Minimal styling for a clean starting point:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.5;
  padding: 1rem;
}

button {
  cursor: pointer;
  padding: 0.5rem 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
}

button:hover {
  background: #f5f5f5;
}
```

## Step 4: Update SPEC.md with Architecture

Update SPEC.md with the project structure, then offer to move to running the app locally.

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
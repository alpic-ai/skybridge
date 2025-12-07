---
sidebar_position: 4
---

# Skybridge Abstractions

Now that you understand [Core Concepts](/concepts), let's see how Skybridge extends the low-level `window.openai` API with modern React abstractions.

## From Imperative to Declarative

The raw `window.openai` API is powerful but imperative. Skybridge wraps these primitives with React hooks, automatic state management, and TypeScript inference.

### Mapping: `window.openai` → Skybridge Hooks

| Raw API | Skybridge Hook | Purpose |
|---------|----------------|---------|
| `window.openai.toolOutput` | [`useToolInfo()`](/api-reference/use-tool-info) | Access initial tool input and output |
| `window.openai.widgetState` | [`useWidgetState()`](/api-reference/use-widget-state) | Manage persistent widget state |
| `window.openai.callTool()` | [`useCallTool()`](/api-reference/use-call-tool) | Make additional tool calls |
| `window.openai.sendFollowUpMessage()` | [`useSendFollowUpMessage()`](/api-reference/use-send-follow-up-message) | Send follow-up messages |
| `window.openai.openExternal()` | [`useOpenExternal()`](/api-reference/use-open-external) | Open external URLs |
| `window.openai.requestDisplayMode()` | [`useRequestModal()`](/api-reference/use-request-modal) | Request modal display |
| `window.openai.theme` | [`useTheme()`](/api-reference/use-theme) | Access ChatGPT theme |
| `window.openai.locale` | [`useLocale()`](/api-reference/use-locale) | Access user locale |
| `window.openai.displayMode` | [`useDisplayMode()`](/api-reference/use-display-mode) | Access display mode |
| `window.openai.userAgent` | [`useUserAgent()`](/api-reference/use-user-agent) | Access user agent info |
| `window.openai.*` | [`useOpenAiGlobal()`](/api-reference/use-openai-global) | Access any global value |

## Example: Before & After

### Without Skybridge (Raw API)

```tsx
const [loading, setLoading] = useState(false);
const [data, setData] = useState(null);
const [theme, setTheme] = useState(window.openai.theme);

useEffect(() => {
  const handleThemeChange = () => setTheme(window.openai.theme);
  window.addEventListener('openai:set_globals', handleThemeChange);
  return () => window.removeEventListener('openai:set_globals', handleThemeChange);
}, []);

const handleClick = async () => {
  setLoading(true);
  try {
    const result = await window.openai.callTool("search", { query: "hotels" });
    setData(result);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};
```

### With Skybridge (React Hooks)

```tsx
import { useCallTool, useTheme } from "skybridge/web";

const { callTool, isPending, data } = useCallTool("search");
const theme = useTheme();

const handleClick = () => {
  callTool({ query: "hotels" });
};
```

Much cleaner! Skybridge handles state management, event listeners, and loading states automatically.

## The Three Actors

ChatGPT Apps introduce a unique challenge: building for **dual interaction surfaces**. Understanding how the three actors communicate is essential:

1. **ChatGPT (Host)**: The conversational interface where users type messages and the model responds
2. **Your MCP Server**: The backend that exposes tools and business logic
3. **Your Widget (Guest)**: The React component rendered in an iframe inside ChatGPT

## Data Flow Patterns

### 1. Tool → Widget (Initial Hydration)

When ChatGPT calls one of your tools, the tool can return `structuredContent` to hydrate the widget:

**Server:**
```ts
server.widget("show_flights", {}, {
  inputSchema: { destination: z.string() },
}, async ({ destination }) => {
  const flights = await searchFlights(destination);
  
  return {
    content: [{ type: "text", text: `Found ${flights.length} flights` }],
    structuredContent: { flights } // This goes to the widget
  };
});
```

**Widget:**
```tsx
import { useToolInfo } from "skybridge/web";

export function FlightWidget() {
  const toolInfo = useToolInfo<{ flights: Flight[] }>();
  
  if (toolInfo.isSuccess) {
    const { flights } = toolInfo.output.structuredContent;
    
    return (
      <ul>
        {flights.map(flight => <li key={flight.id}>{flight.name}</li>)}
      </ul>
    );
  }
  
  return <div>Loading...</div>;
}
```

**Use `useToolInfo` for the initial data** that renders your widget. This data doesn't change—it's the props your widget receives when it first loads.

### 2. Widget → Model (Context Sync)

Your widget needs to communicate its state back to the model so ChatGPT understands what the user is seeing. Use the `data-llm` attribute:

```tsx
export function FlightWidget() {
  const [selectedFlight, setSelectedFlight] = useState(null);
  
  return (
    <div data-llm={selectedFlight 
      ? `User is viewing details for flight ${selectedFlight.id}` 
      : "User is browsing the flight list"
    }>
      {/* Your UI */}
    </div>
  );
}
```

The `data-llm` value is automatically injected into the model's context. This allows ChatGPT to respond contextually:
- User clicks a flight → `data-llm` updates → Model knows which flight they're viewing
- User asks "What's the baggage policy?" → Model has context to answer accurately

**Why declarative?** Only what's currently rendered (and visible to the user) is shared with the model. No need to manually track state transitions.

### 3. Widget → Server (Tool Calls)

Widgets can trigger additional tool calls in response to user actions:

```tsx
import { useCallTool } from "skybridge/web";

export function FlightWidget() {
  const { callTool, isPending, data } = useCallTool("get_flight_details");
  
  const handleViewDetails = (flightId: string) => {
    callTool({ flightId });
  };
  
  return (
    <button onClick={() => handleViewDetails("AF123")} disabled={isPending}>
      {isPending ? "Loading..." : "View Details"}
    </button>
  );
}
```

**Use `useCallTool` when the user performs an action** that requires fetching more data. This hook:
- Manages loading/error/data states automatically
- Provides full TypeScript inference with `generateHelpers`
- Wraps `window.openai.callTool` with a React Query-like API

### 4. Widget → Chat (Follow-up Messages)

Widgets can send messages back into the conversation:

```tsx
import { useSendFollowUpMessage } from "skybridge/web";

export function FlightWidget() {
  const sendMessage = useSendFollowUpMessage();
  
  const handleBookFlight = (flight: Flight) => {
    // User clicked "Book" in the UI
    sendMessage({ 
      prompt: `I'd like to book the ${flight.name} flight. What payment methods do you accept?` 
    });
  };
  
  return <button onClick={() => handleBookFlight(selectedFlight)}>Book Now</button>;
}
```

This creates a continuous loop: the widget can ask the model for help, and the model can respond naturally in the conversation.

## Data Fetching

Widgets are rendered inside an iframe inline with the conversation on ChatGPT. They are hydrated with the initial tool call result that triggered the widget rendering. Once your component is mounted, it can send additional requests in accordance with the iframe CSP.

One way your widget can request additional data is by calling tools on your MCP server. The `useCallTool` hook exported by `skybridge/web` is a wrapper of the underlying `window.openai.callTool` function. This way of requesting data is the preferred way and is guaranteed to be allowed by the iframe CSP.

### When to use

You should use this hook in reaction to a user action on your widget. Do NOT wrap this hook in a `useEffect` hook to call a tool when the widget is mounted.

### Example

```tsx
import { useCallTool } from "skybridge/web";

type ListPokemonToolArgs = { type: "water" | "fire" | "grass" };

type ListPokemonToolResponse = {
  structuredContent: {
    pokemonsCount: number;
    pokemon: {
      name: string;
    }[];
  };
};

export const PokemonWidget: React.FunctionComponent = () => {
  const { callTool, isPending, data } = useCallTool<
    ListPokemonToolArgs,
    ListPokemonToolResponse
  >("listPokemon");

  return (
    <div>
      <p>Pokemon count: {data?.structuredContent.pokemonsCount}</p>
      <button disabled={isPending} onClick={() => callTool({ type: "water" })}>
        Count all water pokemons
      </button>
    </div>
  );
};
```

## Type Safety with generateHelpers

When using `skybridge/server`, you can generate fully typed hooks:

```typescript
// server/src/index.ts
import { McpServer } from "skybridge/server";
import { z } from "zod";

const server = new McpServer({ name: "my-app", version: "1.0" }, {})
  .widget("search-hotels", {}, {
    inputSchema: {
      city: z.string(),
      checkIn: z.string(),
    },
    outputSchema: {
      hotels: z.array(z.object({ id: z.string(), name: z.string() })),
    },
  }, async ({ city, checkIn }) => {
    // Your logic
  });

export type AppType = typeof server;
```

```typescript
// web/src/skybridge.ts
import type { AppType } from "../../server/src/index";
import { generateHelpers } from "skybridge/web";

export const { useCallTool, useToolInfo } = generateHelpers<AppType>();
```

```tsx
// web/src/widgets/search.tsx
import { useCallTool } from "../skybridge";

export function SearchWidget() {
  const { callTool } = useCallTool("search-hotels");
  //                                ^ autocomplete!
  
  callTool({ city: "Paris", checkIn: "2025-12-15" });
  //         ^ autocomplete for input fields!
}
```

## React Query-Inspired API

Skybridge's `useCallTool` is inspired by [TanStack Query](https://tanstack.com/query), providing:

- Automatic loading states (`isPending`, `isSuccess`, `isError`)
- Error handling with `error` object
- Success/error callbacks
- Async/sync modes (`callTool` vs `callToolAsync`)

### Example with Callbacks

```tsx
const { callTool, isPending } = useCallTool("book_hotel");

const handleBooking = () => {
  callTool(
    { hotelId: "123" },
    {
      onSuccess: (data) => {
        console.log("Booking confirmed:", data);
      },
      onError: (error) => {
        console.error("Booking failed:", error);
      },
    }
  );
};
```

### Example with Async Mode

```tsx
const { callToolAsync, isPending } = useCallTool("check_availability");

const handleCheck = async (date: string) => {
  try {
    const result = await callToolAsync({ date });
    if (result.structuredContent.available) {
      // Proceed with booking
    }
  } catch (error) {
    // Handle error
  }
};
```

## Summary: The Communication Loop

1. **ChatGPT calls your tool** → Server responds with `structuredContent`
2. **Widget hydrates** with `useToolInfo`
3. **User interacts** → Widget updates `data-llm` → Model sees the context
4. **User triggers action** → Widget calls `useCallTool` → Server responds
5. **Widget sends follow-up** → `useSendFollowUpMessage` → ChatGPT replies

This loop creates a seamless experience where the conversation, the UI, and your backend work together as one cohesive app.

## Key Takeaways

- Use **`useToolInfo`** for initial data (hydration)
- Use **`useCallTool`** for user-triggered data fetching
- Use **`data-llm`** to sync UI state with the model
- Generate **typed hooks** with `generateHelpers` for autocomplete and type safety
- **Don't call tools on mount**—pass initial data through `structuredContent`

## What's Next?

<div className="card-grid">
  <div className="card">
    <h3>API Reference</h3>
    <p>Complete documentation of all hooks and utilities</p>
    <a href="/api-reference" className="card-link">Browse API →</a>
  </div>
</div>

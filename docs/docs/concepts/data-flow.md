---
sidebar_position: 2
title: Data Flow
---

# Data Flow: Tools, Widgets, and the Model

**Problem:** ChatGPT Apps involve three actors (ChatGPT, your server, your widget) communicating in complex patterns. Understanding this flow is essential.

**Solution:** Skybridge provides clear abstractions for each communication pattern.

## The Three Actors

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'lineColor': '#64748b' }}}%%
flowchart LR
    User["User"]
    Model["Model"]
    Widget["Widget"]
    Server["MCP Server"]

    User <-->|"Converse"| Model
    User <-->|"Interact"| Widget
    Model -->|"Features exposed<br/>as MCP tools"| Server
    Widget -->|"UI pages exposed<br/>as MCP resources"| Server

    style User fill:#f1f5f9,stroke:#64748b,color:#334155
    style Model fill:#f1f5f9,stroke:#64748b,color:#334155
    style Widget fill:#f1f5f9,stroke:#64748b,color:#334155
    style Server fill:#2d7a9a,stroke:#1e6a87,color:#fff
```

1. **ChatGPT (Host)**: The conversational interface where users type messages and the model responds
2. **Your MCP Server**: The backend that exposes tools and business logic
3. **Your Widget (Guest)**: The React component rendered in an iframe inside ChatGPT

## Key Terms

Tool responses contain three fields:

- **`content`**: Text array shown to the model in the conversation
- **`structuredContent`**: Typed JSON data passed to your widget
- **`_meta`**: Optional metadata for both

## Tools vs Widgets

Before diving into data flow, understand the difference:

| | `registerTool()` | `registerWidget()` |
|---|---|---|
| **Has UI?** | No | Yes |
| **Returns** | `content` only (text for the model) | `structuredContent` (data for the widget) + `content` |
| **Renders** | Nothing | A React component |
| **Use case** | Background operations, calculations | Interactive UI |

```typescript
// Tool: No UI, returns text
server.registerTool("calculate", { /* ... */ }, async (args) => {
  return { content: [{ type: "text", text: "Result: 42" }] };
});

// Widget: Has UI, returns structured data
server.registerWidget("chart", { /* ... */ }, { /* ... */ }, async (args) => {
  return {
    content: [{ type: "text", text: "Displaying chart" }],
    structuredContent: { data: [1, 2, 3], labels: ["A", "B", "C"] }
  };
});
```

## Data Flow Patterns

### 1. Tool → Widget (Initial Hydration)

When ChatGPT calls one of your widgets, it returns `structuredContent` to hydrate the React component:

**Server:**
```typescript
server.registerWidget("show_flights", {}, {
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

**Use [`useToolInfo`](/api-reference/hooks/use-tool-info) for the initial data** that renders your widget. This data is set once when the widget loads.

:::note useToolInfo is read-only
`useToolInfo` provides the initial hydration data and should not be used as a mutable data store. For persistent widget state that survives re-renders, use [`useWidgetState`](/api-reference/hooks/use-widget-state).
:::

### 2. Widget → Server (Tool Calls)

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

**Use [`useCallTool`](/api-reference/hooks/use-call-tool) when the user performs an action** that requires fetching more data.

:::warning Don't call tools on mount
Never wrap `callTool` in a `useEffect` to fetch data on mount. Pass initial data through `structuredContent` instead.

**Why?** Tool calls add latency and model round-trips. You control what initially comes from `structuredContent`, leverage it.
:::

### 3. Widget → Model (Context Sync)

Your widget needs to communicate its state back to the model. Use the **`data-llm` attribute** to declaratively describe what the user sees. See [LLM Context Sync](/concepts/llm-context-sync).

### 4. Widget → Chat (Follow-up Messages)

Widgets can send messages back into the conversation:

```tsx
import { useSendFollowUpMessage } from "skybridge/web";

export function FlightWidget() {
  const sendMessage = useSendFollowUpMessage();

  const handleBookFlight = (flight: Flight) => {
    sendMessage({
      prompt: `I'd like to book the ${flight.name} flight. What payment methods do you accept?`
    });
  };

  return <button onClick={() => handleBookFlight(selectedFlight)}>Book Now</button>;
}
```

This creates a continuous loop: the widget can ask the model for help, and the model responds naturally in the conversation.

:::tip When to use sendFollowUpMessage vs data-llm
- **`data-llm`**: For passive context—the model reads it when the user asks a question
- **`sendFollowUpMessage`**: For active prompts—triggers a new model response immediately

If the model's response triggers another widget, ChatGPT renders a new widget instance (not nested inside the current one).
:::

## Response Fields Explained {#response-fields-explained}

Tool responses have three fields:

| Field | Purpose | Consumed by |
|-------|---------|-------------|
| `content` | Text description for the model | ChatGPT (shown in conversation) |
| `structuredContent` | Typed data for the widget | Widget (`useToolInfo`, `useCallTool`) |
| `_meta` | Response metadata | Both (optional) |

```typescript
return {
  content: [{ type: "text", text: "Found 3 flights to Paris" }],
  structuredContent: {
    flights: [{ id: "AF123", name: "Air France 123" }, /* ... */]
  },
  _meta: {
    searchId: "abc123",
    cached: false
  }
};
```

## When to Use What {#when-to-use-what}

| Need | Use | Why |
|------|-----|-----|
| Initial widget data | `useToolInfo` | Data passed at hydration, no extra calls |
| User-triggered fetch | `useCallTool` | Model sees the result, can answer questions |
| Silent background fetch | Direct API call | Model doesn't need to know |
| Describe current UI state | `data-llm` | Passive context for user questions |
| Trigger model response | `sendFollowUpMessage` | Active prompt, immediate reply |
| Persist widget state | `useWidgetState` | Survives re-renders |

:::tip Why useCallTool instead of a direct API call?
`useCallTool` adds the result to the **conversation context**. This means:
- User asks "What's the baggage limit?" → Model can answer using the flight details from context
- User says "Compare this with the previous one" → Model has both results in context

Direct API calls don't add to context. Use them only for data the model doesn't need (analytics, logging, UI-only updates).
:::

:::warning Direct fetch requires CSP configuration
If you use `fetch()` directly from widgets, you need to configure Content Security Policy (CSP) headers. ChatGPT blocks requests to domains not explicitly allowed. Add allowed domains to `connectDomains` in your widget configuration. See [registerWidget](/api-reference/server/register-widget).
:::

## The Communication Loop

1. **ChatGPT calls your tool** → Server responds with `structuredContent`
2. **Widget hydrates** with [`useToolInfo`](/api-reference/hooks/use-tool-info)
3. **User interacts** → Widget updates `data-llm` → Model sees the context
4. **User triggers action** → Widget calls [`useCallTool`](/api-reference/hooks/use-call-tool) → Server responds
5. **Widget sends follow-up** → [`useSendFollowUpMessage`](/api-reference/hooks/use-send-follow-up-message) → ChatGPT replies

This loop creates a seamless experience where the conversation, the UI, and your backend work together.

## Related

- [LLM Context Sync](/concepts/llm-context-sync) - Keep the model informed of widget state (read this next)
- [Fetching Data Guide](/guides/fetching-data) - Patterns for useToolInfo and useCallTool
- [useToolInfo API](/api-reference/hooks/use-tool-info) - Initial data access
- [useCallTool API](/api-reference/hooks/use-call-tool) - User-triggered data fetching
- [useWidgetState API](/api-reference/hooks/use-widget-state) - Persistent widget state

# Fetch and render data

- Fetch structured data and render with custom UI → `view`
- Fetch textual data or trigger actions → `tool`
- Tool can be triggered by user interaction within a view UI

## Project Structure

```
my-app/
├── server/src/
│   ├── index.ts          # HTTP server with middlewares
│   └── server.ts         # McpServer with tool and view registration
├── web/src/
│   ├── views/          # React components (filename = view name)
│   │   └── search-flights.tsx
│   ├── index.css         # Global CSS, must be imported in every view
│   └── helpers.ts        # Type-safe hooks via generateHelpers
└── package.json
```

**Naming convention**: View filename must match registered name using kebab-case.
`search_flights` → register as `search-flights` → file `search-flights.tsx`

## Server Handlers

Output:
- **`structuredContent`**: concise JSON the view uses and the model reads. Include only what the model should see.
- **`content`** (optional): narration (Markdown or plaintext) shown to LLM
- **`_meta`** (optional): large or sensitive data exclusively for the view. _meta never reaches the model.

Annotations (set `true` when):
- **`readOnlyHint`**: only reads data, no side effects
- **`openWorldHint`**: publishes content or reaches outside user's account
- **`destructiveHint`**: deletes or overwrites user data

**Example**:

- server/src/index.ts
```typescript
import { McpServer } from "skybridge/server";
import { z } from "zod";

const server = new McpServer(
  { name: "my-app", version: "0.0.1" },
  { capabilities: {} },
)
  .registerTool(
    {
      name: "search-flights",
      description: "Search for flights",
      inputSchema: { destination: z.string(), dates: z.string() },
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
      view: { component: "search-flights" },
    },
    async ({ destination, dates }) => {
      const flights = await fetchFlights(destination, dates);
      const structuredContent = { flights: [] };
      const _meta = { images: [] }
      for (const { id, departureTime, price, airlineLogo } of flights) {
        structuredContent.flights.push({ id, departureTime, price });
        _meta.images.push(airlineLogo);
      }
      return {
        structuredContent,
        content: [{ type: "text", text: `Found ${flights.length} flights.` }],
        _meta // mind the underscore prefix
      };
    },
  )
  .registerTool(
    {
      name: "book-flight",
      description: "Book a flight",
      inputSchema: { flightId: z.string() },
      annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false },
    },
    async ({ flightId }) => {
      const confirmationId = await bookFlight(flightId);
      return {
        structuredContent: { confirmationId },
        content: [{ type: "text", text: `Flight booked. Confirmation: ${confirmationId}` }],
      };
    },
  );

export default server;
export type AppType = typeof server;
```

A tool becomes a view by adding the `view` field to its config (with `component` matching the registered name). Without `view`, it's a plain tool with no UI.

## UI Components

- generate type-safe hooks with `generateHelpers`
- `useToolInfo`: access view input/output
- `useCallTool`: trigger tool from UI

**Example**:

- web/src/helpers.ts
```typescript
import { generateHelpers } from "skybridge/web";
import type { AppType } from "../../server/src/server";

export const { useToolInfo, useCallTool } = generateHelpers<AppType>();
```

- web/src/views/search-flights.tsx
```tsx
import "@/index.css";
import { mountView } from "skybridge/web";
import { useToolInfo, useCallTool } from "../helpers";

function SearchFlights() {
  const { input, output, isPending, responseMetadata } = useToolInfo<"search-flights">();
  const {
    callTool, // returns void, use `data` to get the actual output
    data: bookFlightOutput,
    isPending: isBooking,
    isSuccess: isBooked,
  } = useCallTool("book-flight");

  if (isPending) {
    return <div>Searching flights to {input?.destination}...</div>;
  }

  if (isBooked) {
    return <div>Booked! Confirmation: {bookFlightOutput.structuredContent.confirmationId}</div>;
  }

  return (
    <div>
      <h2>Flights to {input.destination}</h2>
      <ul>
        {output.flights.map((flight, i) => (
          <li key={i}>
            <img src={responseMetadata.images[i]} />
            {flight.departureTime} - ${flight.price}
            <button
              onClick={() => callTool({ flightId: flight.id })}
              disabled={isBooking}
            >
              {isBooking ? "Booking..." : "Book"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SearchFlights;

mountView(<SearchFlights />);
```

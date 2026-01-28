# Fetch and render data

- Fetch structured data and render with custom UI → `widget`
- Fetch textual data or trigger actions → `tool`
- Tool can be triggered by user interaction within a widget UI

## Project Structure

```
my-app/
├── server/src/
│   └── server.ts          # McpServer with tool and widget registration
├── web/src/
│   ├── widgets/          # React components (filename = widget name)
│   │   └── search-flights.tsx
│   ├── index.css         # Global CSS
│   └── helpers.ts        # Type-safe hooks via generateHelpers
└── package.json
```

**Naming convention**: Widget filename must match registered name using kebab-case.
`search_flights` → register as `search-flights` → file `search-flights.tsx`

## Server Handlers

Output:
**`content`**: Text array shown to the model in the conversation
**`structuredContent`**: Typed JSON data surfaced to your widget and the host
**`_meta`** (optional): Delivered only to the widget and hidden from the model

**Example**:

- server/src/index.ts
```typescript
import { McpServer } from "skybridge/server";
import { z } from "zod";

const server = new McpServer(
  { name: "my-app", version: "0.0.1" },
  { capabilities: {} },
)
  .registerWidget(
    "search-flights",
    { description: "Search for flights" },
    { inputSchema: { destination: z.string(), dates: z.string() } },
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
        _meta
      };
    }
  )
  .registerTool(
    "book-flight",
    {
      description: "Book a flight",
      inputSchema: { flightId: z.string() },
    },
    async ({ flightId }) => {
      const confirmationId = await bookFlight(flightId);
      return {
        structuredContent: { confirmationId },
        content: [{ type: "text", text: `Flight booked. Confirmation: ${confirmationId}` }],
      };
    }
  );

export default server;
export type AppType = typeof server;
```

## UI Components

- generate type-safe hooks with `generateHelpers`
- `useToolInfo`: access widget input/output
- `useCallTool`: trigger tool from UI

**Example**:

- web/src/helpers.ts
```typescript
import { generateHelpers } from "skybridge/web";
import type { AppType } from "../../server/src/server";

export const { useToolInfo, useCallTool } = generateHelpers<AppType>();
```

- web/src/widgets/search-flights.tsx
```tsx
import "@/index.css";
import { mountWidget } from "skybridge/web";
import { useToolInfo, useCallTool } from "../helpers";

function SearchFlights() {
  const { input, output, isPending, responseMetadata } = useToolInfo<"search-flights">();
  const {
    callTool,
    isPending: isBooking,
    isSuccess: isBooked,
    data: booking
  } = useCallTool("book-flight");

  if (isPending) {
    return <div>Searching flights to {input.destination}...</div>;
  }

  if (isBooked) {
    return <div>Booked! Confirmation: {booking.structuredContent.confirmationId}</div>;
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

mountWidget(<SearchFlights />);
```




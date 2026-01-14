---
sidebar_position: 2
title: McpServer
---

# McpServer

The main class for building MCP servers with Skybridge.

## Import

```typescript
import { McpServer } from "skybridge/server";
```

## Constructor

```typescript
const server = new McpServer(
  serverInfo: { name: string; version: string },
  options: McpServerOptions
);
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `serverInfo.name` | `string` | Name of your MCP server |
| `serverInfo.version` | `string` | Version of your server |
| `options` | `McpServerOptions` | Configuration options |

### Options

```typescript
type McpServerOptions = {
  // Additional options as needed
};
```

## Methods

### registerWidget

Register an interactive widget with UI. See [registerWidget](/api-reference/server/register-widget) for details.

```typescript
server.registerWidget(name, resourceConfig, toolConfig, handler);
```

### registerTool

Register a tool without UI (inherited from MCP SDK).

```typescript
server.registerTool(name, config, handler);
```

## Type Export Pattern

Export the server type for client-side type inference:

```typescript
const server = new McpServer({ name: "my-app", version: "1.0" }, {})
  .registerWidget("search", {}, { inputSchema: { query: z.string() } }, async ({ query }) => {
    return { structuredContent: { results: [] } };
  });

// Export for generateHelpers
export type AppType = typeof server;
```

## Method Chaining

You **must** use method chaining for type inference to work. See [Type Safety: Method Chaining](/concepts/type-safety#method-chaining) for details.

## Example

```typescript
import { McpServer } from "skybridge/server";
import { z } from "zod";

const server = new McpServer(
  { name: "hotel-booking", version: "1.0.0" },
  {}
)
  .registerWidget("search-hotels", {
    description: "Search for hotels",
  }, {
    inputSchema: {
      city: z.string().describe("City to search"),
      checkIn: z.string().describe("Check-in date"),
      checkOut: z.string().describe("Check-out date"),
      guests: z.number().optional().default(2),
    },
    outputSchema: {
      hotels: z.array(z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        rating: z.number(),
      })),
    },
  }, async ({ city, checkIn, checkOut, guests }) => {
    const hotels = await searchHotels({ city, checkIn, checkOut, guests });

    return {
      content: [{ type: "text", text: `Found ${hotels.length} hotels in ${city}` }],
      structuredContent: { hotels },
    };
  })
  .registerWidget("hotel-details", {
    description: "Get hotel details",
  }, {
    inputSchema: {
      hotelId: z.string(),
    },
  }, async ({ hotelId }) => {
    const hotel = await getHotel(hotelId);

    return {
      content: [{ type: "text", text: `Showing details for ${hotel.name}` }],
      structuredContent: hotel,
    };
  });

export type AppType = typeof server;
export default server;
```

## Related

- [registerWidget](/api-reference/server/register-widget) - Widget registration details
- [generateHelpers](/api-reference/utilities/generate-helpers) - Client-side type inference
- [Type Safety concept](/concepts/type-safety) - Understanding the type system

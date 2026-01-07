---
sidebar_position: 4
---

# useCallTool

The `useCallTool` function allows you to call additional MCP tools from your widget. It wraps the [`window.openai.callTool`](https://developers.openai.com/apps-sdk/build/chatgpt-ui#trigger-server-actions) function while providing a more convenient state management and typed API.

Make sure your tool `_meta["openai/widgetAccessible"]` property is set to `true` to make it accessible from widgets - more info on [component-initiated tool calls](https://developers.openai.com/apps-sdk/build/mcp-server#component-initiated-tool-calls).

## Basic usage

```tsx
import { useCallTool } from "skybridge/web";
import { useState } from "react";

function BookTableWidget() {
  const { callTool, isPending, isSuccess, data } = useCallTool<
    { time: string; people: number },
    { structuredContent: { tableNumber: string } }
  >("bookTable");

  return (
    <div>
      <button
        disabled={isPending}
        onClick={() => callTool({ time: "12:00", people: 2 })}
      >
        Book Table
      </button>
      {isSuccess && <p>Table booked: {data.structuredContent.tableNumber}</p>}
    </div>
  );
}
```

## Parameters

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
} = useCallTool<ToolArgs, ToolResponse>(name);

callTool(toolArgs, {
  onError,
  onSettled,
  onSuccess,
});

await callToolAsync(toolArgs);
```

### `name`

```tsx
name: string;
```

**Required**

The name of the tool to call. This must match the name of a tool registered on your MCP server.

## Type Parameters

### `ToolArgs`

```tsx
ToolArgs extends CallToolArgs = null
```

The type of arguments your tool accepts. Defaults to `null` for tools that don't require arguments.

- If your tool has no arguments, you can omit this type parameter or set it to `null`.
- If your tool requires arguments, define the shape as a `Record<string, unknown>`.

### `ToolResponse`

```tsx
ToolResponse extends Partial<
  { structuredContent: Record<string, unknown>; _meta: Record<string, unknown> }
> = {}
```

The type of the response returned by your tool. This allows you to specify the exact shape of both the `structuredContent` and `_meta` fields of your tool's response.

## Returns

### `callTool`

```tsx
callTool: (toolArgs?: ToolArgs, sideEffects?: SideEffects) => void
```

The mutation function you can call to trigger the tool. Optionally pass side-effect callbacks.

- `toolArgs: ToolArgs`
  - Optional if `ToolArgs` is `null`
  - The arguments to pass to the tool
- `sideEffects: SideEffects`
  - Optional
  - The side-effect callbacks to execute when the tool call is successful, encounters an error, or is settled:
    - `onSuccess: (data: ToolResponse, toolArgs: ToolArgs) => void`
      - Optional
      - This function will fire when the tool call is successful and will be passed the tool's response
    - `onError: (error: unknown, toolArgs: ToolArgs) => void`
      - Optional
      - This function will fire if the tool call encounters an error
    - `onSettled: (data: ToolResponse | undefined, error: unknown | undefined, toolArgs: ToolArgs) => void`
      - Optional
      - This function will fire when the tool call is either successful or encounters an error

### `callToolAsync`

```tsx
callToolAsync: (toolArgs?: ToolArgs) => Promise<ToolResponse>;
```

Similar to `callTool` but returns a promise which can be awaited.

### `status`

```tsx
status: "idle" | "pending" | "success" | "error";
```

- `idle` - Initial status prior to the tool call executing
- `pending` - The tool call is currently executing
- `success` - The last tool call was successful
- `error` - The last tool call resulted in an error

### `isIdle`, `isPending`, `isSuccess`, `isError`

```tsx
isIdle: boolean;
isPending: boolean;
isSuccess: boolean;
isError: boolean;
```

Boolean variables derived from `status` for convenience.

### `data`

```tsx
data: ToolResponse | undefined;
```

- The successfully resolved data from the last tool call. Only available when the status is `success`.
- Contains the default `CallToolResponse` shape merged with your `ToolResponse` type:

```tsx
type CallToolResponse = {
  /** content, isError and result shape is not configurable and shared across all tools */
  content: { type: "text"; text: string }[];
  isError: boolean;
  result: string;
  /** structuredContent and meta are shaped according to your ToolResponse type parameter */
  structuredContent: Record<string, unknown>;
  _meta: Record<string, unknown>;
};
```

### `error`

```tsx
error: unknown | undefined;
```

- Only available when the status is `error`.
- The error object if the last tool call encountered an error

## Examples

### With Side Effects

Handle success, error, and settled states with callbacks:

```tsx
import { useCallTool } from "skybridge/web";

function SubmitForm() {
  const { callTool, isPending } = useCallTool<{ email: string }>("subscribe");

  const handleSubmit = (email: string) => {
    callTool(
      { email },
      {
        onSuccess: (data) => {
          console.log("Subscribed successfully!", data);
        },
        onError: (error) => {
          console.error("Subscription failed:", error);
        },
        onSettled: (data, error) => {
          console.log("Request completed", { data, error });
        },
      }
    );
  };

  return (
    <button
      disabled={isPending}
      onClick={() => handleSubmit("user@example.com")}
    >
      Subscribe
    </button>
  );
}
```

### Tools without arguments

You can pass side effect options as the first argument to the `callTool` function if it doesn't require any arguments.

```tsx
import { useCallTool } from "skybridge/web";

function RefreshButton() {
  const { callTool, isPending } = useCallTool("refresh");

  return (
    <button
      disabled={isPending}
      onClick={() =>
        callTool({
          onSuccess: () => {
            console.log("Refreshed");
          },
        })
      }
    >
      {isPending ? "Refreshing..." : "Refresh"}
    </button>
  );
}
```

### Async/Await Pattern

Use `callToolAsync` for async/await syntax:

```tsx
import { useCallTool } from "skybridge/web";

function AsyncExample() {
  const { callToolAsync, isPending, isError, error } = useCallTool<
    { id: string },
    { structuredContent: { name: string; price: number } }
  >("getProduct");

  const handleClick = async () => {
    try {
      const response = await callToolAsync({ id: "123" });
      console.log("Product:", response.structuredContent.name);
    } catch (err) {
      console.error("Failed to fetch product:", err);
    }
  };

  return (
    <div>
      <button disabled={isPending} onClick={handleClick}>
        Fetch Product
      </button>
      {isError && <p>Error: {String(error)}</p>}
    </div>
  );
}
```

### Typed Response

Leverage TypeScript to get full type safety on the response:

```tsx
import { useCallTool } from "skybridge/web";

type WeatherArgs = {
  city: string;
  units?: "metric" | "imperial";
};

type WeatherResponse = {
  structuredContent: {
    temperature: number;
    conditions: string;
    humidity: number;
  };
};

function WeatherWidget() {
  const { callTool, data, isPending, isSuccess } = useCallTool<
    WeatherArgs,
    WeatherResponse
  >("getWeather");

  return (
    <div>
      <button
        disabled={isPending}
        onClick={() => callTool({ city: "Paris", units: "metric" })}
      >
        Get Weather
      </button>

      {isSuccess && (
        <div>
          <p>Temperature: {data.structuredContent.temperature}°C</p>
          <p>Conditions: {data.structuredContent.conditions}</p>
          <p>Humidity: {data.structuredContent.humidity}%</p>
        </div>
      )}
    </div>
  );
}
```

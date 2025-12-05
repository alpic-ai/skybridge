---
sidebar_position: 10
---

# useToolInfo

The `useToolInfo` hook provides access to the tool's input arguments, output, and response metadata. It also tracks whether the tool execution is still pending or has completed successfully.

## Basic usage

```tsx
import { useToolInfo } from "skybridge/web";

function WeatherWidget() {
  const { input, output, isPending, isSuccess } = useToolInfo<{
    input: { city: string };
    output: { temperature: number; conditions: string };
  }>();

  if (isPending) {
    return <p>Loading weather for {input.city}...</p>;
  }

  if (isSuccess) {
    return (
      <div>
        <h3>Weather in {input.city}</h3>
        <p>{output.temperature}°C - {output.conditions}</p>
      </div>
    );
  }

  return null;
}
```

## Type Parameters

### `ToolSignature`

```tsx
type ToolSignature = {
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  responseMetadata?: Record<string, unknown>;
}
```

An optional type parameter to specify the shape of your tool's input, output, and response metadata.

## Returns

The hook returns an object that varies based on the current status:

### When `status` is `"pending"`

```tsx
{
  status: "pending";
  isPending: true;
  isSuccess: false;
  input: ToolInput;
  output: undefined;
  responseMetadata: undefined;
}
```

### When `status` is `"success"`

```tsx
{
  status: "success";
  isPending: false;
  isSuccess: true;
  input: ToolInput;
  output: ToolOutput;
  responseMetadata: ToolResponseMetadata;
}
```

### Properties

#### `status`

```tsx
status: "pending" | "success"
```

- `pending` - The tool is still executing
- `success` - The tool has completed and output is available

#### `isPending`, `isSuccess`

```tsx
isPending: boolean;
isSuccess: boolean;
```

Boolean flags derived from `status` for convenience.

#### `input`

```tsx
input: ToolInput
```

The input arguments passed to the tool. Always available.

#### `output`

```tsx
output: ToolOutput | undefined
```

The tool's output data. Only available when `status` is `"success"`.

#### `responseMetadata`

```tsx
responseMetadata: ToolResponseMetadata | undefined
```

Additional metadata from the tool response. Only available when `status` is `"success"`.

## Examples

### Loading State

```tsx
import { useToolInfo } from "skybridge/web";

function DataWidget() {
  const { input, isPending, isSuccess, output } = useToolInfo<{
    input: { query: string };
    output: { results: string[] };
  }>();

  return (
    <div>
      <h3>Search: {input.query}</h3>
      {isPending && (
        <div className="loading">
          <span className="spinner" />
          <p>Searching...</p>
        </div>
      )}
      {isSuccess && (
        <ul>
          {output.results.map((result, i) => (
            <li key={i}>{result}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### With Response Metadata

```tsx
import { useToolInfo } from "skybridge/web";

function ApiResultWidget() {
  const { input, output, responseMetadata, isSuccess } = useToolInfo<{
    input: { endpoint: string };
    output: { data: unknown };
    responseMetadata: { 
      requestId: string;
      duration: number;
      cached: boolean;
    };
  }>();

  if (!isSuccess) {
    return <p>Loading {input.endpoint}...</p>;
  }

  return (
    <div>
      <pre>{JSON.stringify(output.data, null, 2)}</pre>
      <footer className="metadata">
        <span>Request ID: {responseMetadata.requestId}</span>
        <span>Duration: {responseMetadata.duration}ms</span>
        {responseMetadata.cached && <span>Cached</span>}
      </footer>
    </div>
  );
}
```

### Conditional Rendering Based on Input

```tsx
import { useToolInfo } from "skybridge/web";

type ChartType = "bar" | "line" | "pie";

function ChartWidget() {
  const { input, output, isSuccess } = useToolInfo<{
    input: { type: ChartType; data: number[] };
    output: { processedData: { label: string; value: number }[] };
  }>();

  if (!isSuccess) {
    return <p>Processing chart data...</p>;
  }

  switch (input.type) {
    case "bar":
      return <BarChart data={output.processedData} />;
    case "line":
      return <LineChart data={output.processedData} />;
    case "pie":
      return <PieChart data={output.processedData} />;
    default:
      return <p>Unknown chart type</p>;
  }
}
```

### Progressive Enhancement

```tsx
import { useToolInfo } from "skybridge/web";

function ProductWidget() {
  const { input, output, isPending, isSuccess } = useToolInfo<{
    input: { productId: string; name: string };
    output: { 
      price: number;
      stock: number;
      reviews: { rating: number; count: number };
    };
  }>();

  return (
    <div className="product-card">
      {/* Always show name from input */}
      <h2>{input.name}</h2>

      {/* Show skeleton while loading */}
      {isPending && (
        <>
          <div className="skeleton price-skeleton" />
          <div className="skeleton stock-skeleton" />
        </>
      )}

      {/* Show full details when loaded */}
      {isSuccess && (
        <>
          <p className="price">${output.price}</p>
          <p className="stock">
            {output.stock > 0 ? `${output.stock} in stock` : "Out of stock"}
          </p>
          <div className="reviews">
            <span>⭐ {output.reviews.rating}</span>
            <span>({output.reviews.count} reviews)</span>
          </div>
        </>
      )}
    </div>
  );
}
```

### Error Handling Pattern

```tsx
import { useToolInfo } from "skybridge/web";

function SafeWidget() {
  const { input, output, isSuccess } = useToolInfo<{
    input: { id: string };
    output: { success: boolean; data?: unknown; error?: string };
  }>();

  if (!isSuccess) {
    return <p>Loading...</p>;
  }

  if (!output.success) {
    return (
      <div className="error">
        <p>Error: {output.error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="success">
      <pre>{JSON.stringify(output.data, null, 2)}</pre>
    </div>
  );
}
```


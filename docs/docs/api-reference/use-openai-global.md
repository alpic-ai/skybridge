---
sidebar_position: 9
---

# useOpenAiGlobal

The `useOpenAiGlobal` hook is a low-level hook that subscribes to global state values exposed by the OpenAI host. This hook powers many of the other Skybridge hooks and can be used directly when you need access to specific global values.

:::tip
For most use cases, prefer using the specialized hooks like `useTheme`, `useLocale`, `useDisplayMode`, etc., as they provide a more convenient API.
:::

## Basic usage

```tsx
import { useOpenAiGlobal } from "skybridge/web";

function ThemeDisplay() {
  const theme = useOpenAiGlobal("theme");

  return <p>Current theme: {theme}</p>;
}
```

## Parameters

### `key`

```tsx
key: keyof OpenAiProperties
```

**Required**

The key of the global value to subscribe to. Available keys include:

| Key | Type | Description |
|-----|------|-------------|
| `theme` | `"light" \| "dark"` | The current color theme |
| `locale` | `string` | The user's locale (e.g., `"en-US"`) |
| `displayMode` | `"inline" \| "fullscreen" \| "pip"` | The widget's display mode |
| `userAgent` | `UserAgent` | Device and capability information |
| `maxHeight` | `number` | Maximum height available for the widget |
| `safeArea` | `SafeArea` | Safe area insets for the widget |
| `toolInput` | `object` | The input arguments passed to the tool |
| `toolOutput` | `object \| null` | The tool's output (when available) |
| `toolResponseMetadata` | `object \| null` | Additional metadata from the tool response |
| `widgetState` | `object \| null` | The persisted widget state |

## Returns

```tsx
value: OpenAiProperties[K] | undefined
```

The current value of the specified global, or `undefined` if not available.

## Examples

### Reading Safe Area Insets

```tsx
import { useOpenAiGlobal } from "skybridge/web";

function SafeAreaAwareWidget() {
  const safeArea = useOpenAiGlobal("safeArea");

  if (!safeArea) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        paddingTop: safeArea.insets.top,
        paddingBottom: safeArea.insets.bottom,
        paddingLeft: safeArea.insets.left,
        paddingRight: safeArea.insets.right,
      }}
    >
      <p>Content with safe area padding</p>
    </div>
  );
}
```

### Respecting Max Height

```tsx
import { useOpenAiGlobal } from "skybridge/web";

function ScrollableContent() {
  const maxHeight = useOpenAiGlobal("maxHeight");

  return (
    <div
      style={{
        maxHeight: maxHeight ? `${maxHeight}px` : "auto",
        overflow: "auto",
      }}
    >
      {/* Scrollable content */}
    </div>
  );
}
```

### Accessing Tool Input

```tsx
import { useOpenAiGlobal } from "skybridge/web";

function ToolInputDisplay() {
  const toolInput = useOpenAiGlobal("toolInput");

  return (
    <div>
      <h3>Tool Input:</h3>
      <pre>{JSON.stringify(toolInput, null, 2)}</pre>
    </div>
  );
}
```

### Multiple Globals

```tsx
import { useOpenAiGlobal } from "skybridge/web";

function EnvironmentInfo() {
  const theme = useOpenAiGlobal("theme");
  const locale = useOpenAiGlobal("locale");
  const displayMode = useOpenAiGlobal("displayMode");
  const userAgent = useOpenAiGlobal("userAgent");

  return (
    <div>
      <h3>Environment</h3>
      <ul>
        <li>Theme: {theme}</li>
        <li>Locale: {locale}</li>
        <li>Display Mode: {displayMode}</li>
        <li>Device: {userAgent?.device.type}</li>
        <li>Touch: {userAgent?.capabilities.touch ? "Yes" : "No"}</li>
        <li>Hover: {userAgent?.capabilities.hover ? "Yes" : "No"}</li>
      </ul>
    </div>
  );
}
```

## Type Reference

### `OpenAiProperties`

```tsx
type OpenAiProperties = {
  theme: "light" | "dark";
  userAgent: UserAgent;
  locale: string;
  maxHeight: number;
  displayMode: "inline" | "fullscreen" | "pip";
  safeArea: SafeArea;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown> | { text: string } | null;
  toolResponseMetadata: Record<string, unknown> | null;
  widgetState: Record<string, unknown> | null;
};
```

### `UserAgent`

```tsx
type UserAgent = {
  device: { type: "mobile" | "tablet" | "desktop" | "unknown" };
  capabilities: {
    hover: boolean;
    touch: boolean;
  };
};
```

### `SafeArea`

```tsx
type SafeArea = {
  insets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
};
```


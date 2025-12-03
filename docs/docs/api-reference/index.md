---
sidebar_position: 0
sidebar_label: Overview
---

# API Reference

This section contains detailed documentation for all hooks and utilities provided by `skybridge/web`.

## Hooks

### State Management

| Hook             | Description                                 |
| ---------------- | ------------------------------------------- |
| `useToolInfo`    | Get initial tool input, output and metadata |
| `useWidgetState` | Persist state across widget renders         |

### User Interface

| Hook              | Description                                        |
| ----------------- | -------------------------------------------------- |
| `useTheme`        | Get the current user theme                         |
| `useDisplayMode`  | Get and request widget display mode changes        |
| `useRequestModal` | Open a modal portaled outside of the widget iframe |
| `useLocale`       | Get the user's locale                              |
| `useUserAgent`    | Get device type and capabilities                   |

### Actions

| Hook                              | Description                                  |
| --------------------------------- | -------------------------------------------- |
| [`useCallTool`](./useCallTool.md) | Call tools from within a widget              |
| `useOpenExternal`                 | Open external links                          |
| `useSendFollowUpMessage`          | Send a follow-up message in the conversation |
| `useFiles`                        | Upload and download files                    |

## Deprecated hooks

These hooks are deprecated and will be removed in a future version.

| Hook                      | Description                   | Replaced by   |
| ------------------------- | ----------------------------- | ------------- |
| `useToolOutput`           | Get the initial tool output   | `useToolInfo` |
| `useToolResponseMetadata` | Get the initial tool metadata | `useToolInfo` |

## Import

All hooks are exported from `skybridge/web`:

```tsx
import {
  useCallTool,
  useToolInfo,
  useTheme,
  useDisplayMode,
  // ... other hooks
} from "skybridge/web";
```

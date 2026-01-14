---
sidebar_position: 0
sidebar_label: Overview
---

# API Reference

This section contains detailed documentation for all hooks and utilities provided by `skybridge/web`.

## Hooks

### State Management

| Hook                                   | Description                                 |
| -------------------------------------- | ------------------------------------------- |
| [`useToolInfo`](./hooks/use-tool-info)       | Get initial tool input, output and metadata |
| [`useWidgetState`](./hooks/use-widget-state) | Persist state across widget renders         |

### Context Sync

| Feature                      | Description                                                         |
| ---------------------------- | ------------------------------------------------------------------- |
| [`data-llm`](./utilities/data-llm)     | Sync widget UI state with the model for contextual responses        |

### Utilities

| Utility                         | Description                                                       |
| ------------------------------- | ----------------------------------------------------------------- |
| [`createStore`](./utilities/create-store) | Create a Zustand store that automatically syncs with widget state |

### User Interface

| Hook                                     | Description                                          |
| ---------------------------------------- | ---------------------------------------------------- |
| [`useLayout`](./hooks/use-layout)              | Get layout and visual environment (theme, safe area) |
| [`useUser`](./hooks/use-user)                  | Get user information (locale, device type)           |
| [`useDisplayMode`](./hooks/use-display-mode)   | Get and request widget display mode changes          |
| [`useRequestModal`](./hooks/use-request-modal) | Open a modal portaled outside of the widget iframe   |

### Actions

| Hook                                                     | Description                                  |
| -------------------------------------------------------- | -------------------------------------------- |
| [`useCallTool`](./hooks/use-call-tool)                         | Call tools from within a widget              |
| [`useOpenExternal`](./hooks/use-open-external)                 | Open external links                          |
| [`useSendFollowUpMessage`](./hooks/use-send-follow-up-message) | Send a follow-up message in the conversation |
| [`useFiles`](./hooks/use-files)                                | Upload and download files                    |

### Others

| Hook                                     | Description                                                 |
| ---------------------------------------- | ----------------------------------------------------------- |
| [`useAppsSdkContext`](./hooks/use-apps-sdk-context) | Low-level hook to subscribe to `window.openai` state values |

## Import

All hooks and utilities are exported from `skybridge/web`:

```tsx
import {
  createStore,
  useCallTool,
  useDisplayMode,
  useFiles,
  useLayout,
  useAppsSdkContext,
  useOpenExternal,
  useRequestModal,
  useSendFollowUpMessage,
  useToolInfo,
  useUser,
  useWidgetState,
} from "skybridge/web";
```

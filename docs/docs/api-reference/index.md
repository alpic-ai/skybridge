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
| [`useToolInfo`](./use-tool-info)       | Get initial tool input, output and metadata |
| [`useWidgetState`](./use-widget-state) | Persist state across widget renders         |

### Context Sync

| Feature                      | Description                                                         |
| ---------------------------- | ------------------------------------------------------------------- |
| [`data-llm`](./data-llm)     | Sync widget UI state with the model for contextual responses        |

### Utilities

| Utility                         | Description                                                       |
| ------------------------------- | ----------------------------------------------------------------- |
| [`createStore`](./create-store) | Create a Zustand store that automatically syncs with widget state |

### User Interface

| Hook                                     | Description                                          |
| ---------------------------------------- | ---------------------------------------------------- |
| [`useLayout`](./use-layout)              | Get layout and visual environment (theme, safe area) |
| [`useUser`](./use-user)                  | Get user information (locale, device type)           |
| [`useDisplayMode`](./use-display-mode)   | Get and request widget display mode changes          |
| [`useRequestModal`](./use-request-modal) | Open a modal portaled outside of the widget iframe   |

### Actions

| Hook                                                     | Description                                  |
| -------------------------------------------------------- | -------------------------------------------- |
| [`useCallTool`](./use-call-tool)                         | Call tools from within a widget              |
| [`useOpenExternal`](./use-open-external)                 | Open external links                          |
| [`useSendFollowUpMessage`](./use-send-follow-up-message) | Send a follow-up message in the conversation |
| [`useFiles`](./use-files)                                | Upload and download files                    |

### Others

| Hook                                     | Description                                                 |
| ---------------------------------------- | ----------------------------------------------------------- |
| [`useAppsSdkBridge`](./use-apps-sdk-bridge) | Low-level hook to subscribe to `window.openai` state values |

## Import

All hooks and utilities are exported from `skybridge/web`:

```tsx
import {
  createStore,
  useCallTool,
  useDisplayMode,
  useFiles,
  useLayout,
  useAppsSdkBridge,
  useOpenExternal,
  useRequestModal,
  useSendFollowUpMessage,
  useToolInfo,
  useUser,
  useWidgetState,
} from "skybridge/web";
```

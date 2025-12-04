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

### User Interface

| Hook                                     | Description                                        |
| ---------------------------------------- | -------------------------------------------------- |
| [`useTheme`](./use-theme)                | Get the current user theme                         |
| [`useDisplayMode`](./use-display-mode)   | Get and request widget display mode changes        |
| [`useRequestModal`](./use-request-modal) | Open a modal portaled outside of the widget iframe |
| [`useLocale`](./use-locale)              | Get the user's locale                              |
| [`useUserAgent`](./use-user-agent)       | Get device type and capabilities                   |

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
| [`useOpenAiGlobal`](./use-openai-global) | Low-level hook to subscribe to `window.openai` state values |

## Import

All hooks are exported from `skybridge/web`:

```tsx
import {
  useCallTool,
  useDisplayMode,
  useFiles,
  useLocale,
  useOpenAiGlobal,
  useOpenExternal,
  useRequestModal,
  useSendFollowUpMessage,
  useTheme,
  useToolInfo,
  useUserAgent,
  useWidgetState,
} from "skybridge/web";
```

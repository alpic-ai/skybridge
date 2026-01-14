---
sidebar_position: 1
title: DevTools
---

# DevTools

Skybridge provides a lightweight emulator running inside your browser for testing widgets locally.

:::tip Full Guide
For the complete development workflow, HMR setup, and when to use DevTools vs ChatGPT, see [Fast Iteration](/concepts/fast-iteration).
:::

## Quick Start

When you run `pnpm dev`, DevTools is available at `http://localhost:3000/`.

**Features:**
- Tool listing and input forms
- Widget preview with mocked `window.openai`
- Theme/locale/display mode switching
- Response inspector for `content`, `structuredContent`, `_meta`

## Custom Integration

If you're not using the Skybridge starter template, add DevTools to your server:

```typescript
import { devtoolsStaticServer, widgetsDevServer } from "skybridge/server";

if (process.env.NODE_ENV !== "production") {
  app.use(await devtoolsStaticServer());
  app.use(await widgetsDevServer());
}
```

## Related

- [Fast Iteration](/concepts/fast-iteration) - Development workflow and concepts
- [Test Your App](/quickstart/test-your-app) - Testing in ChatGPT dev mode

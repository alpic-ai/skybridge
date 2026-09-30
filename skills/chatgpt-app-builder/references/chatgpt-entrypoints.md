# ChatGPT entrypoints and deep links

Let users open a view without the model → `openai` on `registerTool`, `useDeepLink`, `useHost().openai`

These are OpenAI MCP extensions: only ChatGPT reads them, other hosts ignore them.

## Entrypoints

```ts
server.registerTool(
  {
    name: "library",
    title: "Parts Library",
    description: "Browse the parts catalog.",
    view: { component: "library" },
    openai: {
      entrypoints: ["global", "thread", { file: [".stl"] }],
      availableDisplayModes: ["inline", "fullscreen"],
    },
  },
  async () => ({ structuredContent: { parts: await listParts() } }),
);
```

- `"global"` adds a sidebar entry, `"thread"` a tab in a conversation's side panel, `{ file: [...] }` a viewer for those file extensions.
- ChatGPT calls global and thread tools with `{}`: every input must be optional, or Skybridge throws at startup.
- Give the tool a `title` that differs from the app name: it labels the entry.
- The server `icons` cover every entry. Add tool `icons` only to tell several entrypoints apart.
- Entrypoints always open fullscreen.

## Deep links

A global entrypoint can open on a page: `https://chatgpt.com/plugins/<pluginId>/app/library?path=%2Fparts%2Fhex-bolt`.

```tsx
import { useDeepLink } from "skybridge/web";

const deepLink = useDeepLink();
useEffect(() => {
  if (deepLink) navigate(deepLink);
}, [deepLink, navigate]);
```

`deepLink` is the app-relative URL (`"/parts/hex-bolt"`), or `undefined` when there is none.

## Feature detection

```tsx
const { openai } = useHost();
if (openai.files) {
  showOpenInChatGPT();
}
```

`openai.resource`, `openai.modelContext`, `openai.message` and `openai.files` are `false` outside ChatGPT.

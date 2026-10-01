# ChatGPT entrypoints, deep links, mentions, messages and files

Let users open a view without the model → `openai` on `registerTool`, `useDeepLink`, `useHost().openaiCapabilities`. Mentions, titled messages and local files → `registerMentions`, `useSendFollowUpMessage`, `useOpenFile`

These are OpenAI MCP extensions, not part of MCP or MCP Apps: only ChatGPT reads them, other hosts ignore them.

## Entrypoints

One tool per kind of entrypoint. Sidebar and conversation tab, called with `{}`:

```ts
server.registerTool(
  {
    name: "library",
    title: "Parts Library",
    description: "Browse the parts catalog.",
    icons: [{ src: "https://example.com/library.svg", mimeType: "image/svg+xml" }],
    view: { component: "library" },
    openai: { entrypoints: [{ type: "global" }, { type: "thread" }] },
  },
  async () => ({ structuredContent: { parts: await listParts() } }),
);
```

File viewer, called with the opened file:

```ts
server.registerTool(
  {
    name: "part-viewer",
    title: "Part Viewer",
    description: "Open a CAD part.",
    inputSchema: { file: z.object({ name: z.string(), resourceUri: z.string() }) },
    icons: [{ src: "https://example.com/part.svg", mimeType: "image/svg+xml" }],
    view: { component: "part-viewer" },
    openai: { entrypoints: [{ type: "file", extensions: [".stl"] }] },
  },
  async ({ file }) => ({ structuredContent: { name: file.name } }),
);
```

- `global` adds a sidebar entry, `thread` a tab in a conversation's side panel, `file` a viewer for those file extensions.
- ChatGPT calls global and thread tools with `{}`: every input must be optional, or Skybridge throws at startup.
- A file entrypoint passes `{ file: { name, resourceUri } }`. Extensions must start with `.`.
- Give each tool a `title` that differs from the app name: it labels the entry.
- Set `icons` on every entrypoint tool: a monochrome 20x20 SVG using `currentColor`.
- Global, thread and file entrypoints open fullscreen.

## Deep links

A deep link opens ChatGPT with your app already open, from anywhere outside ChatGPT: an "Open in ChatGPT" button on your website, a link in an email or in your docs. It targets a tool with a `global` entrypoint:

```text
https://chatgpt.com/plugins/<plugin-id>/app/<tool-name>
```

Add `path` to land on a page of your view. Its value is an app-relative URL, query included, percent-encoded:

```text
https://chatgpt.com/plugins/<plugin-id>/app/library?path=%2Fparts%2Fhex-bolt%3Funit%3Dmm
```

The view reads it with `useDeepLink()`, here `"/parts/hex-bolt?unit=mm"`, and routes to it:

```tsx
import { useDeepLink } from "skybridge/web";

const deepLink = useDeepLink();
useEffect(() => {
  if (deepLink) navigate(deepLink);
}, [deepLink, navigate]);
```

- Without `path`, the view opens on `/`. `useDeepLink()` is `undefined` when the view wasn't opened from a deep link.
- `<plugin-id>` is in your plugin's URL, `https://chatgpt.com/plugins/<plugin-id>`.
- Desktop and mobile apps use `codex://plugins/<plugin-id>/app/<tool-name>` and `chatgpt://plugins/<plugin-id>/app/<tool-name>`. Android doesn't support deep links.

## Feature detection

```tsx
const { openaiCapabilities } = useHost();
if (openaiCapabilities.files) {
  showOpenInChatGPT();
}
```

`resource`, `modelContext`, `message` and `files` are `false` outside ChatGPT.

## At-mentions

```ts
server.registerMentions({
  name: "search_parts",
  handler: async ({ query }) => ({
    items: findParts(query).map((part) => ({
      type: "resource_link",
      uri: `parts://${part.id}`,
      name: part.name,
    })),
  }),
});
```

Users type `@` and the app to mention individual items. The tool is hidden from the model. ChatGPT desktop only.

## Messages

```tsx
const send = useSendFollowUpMessage();
send([{ type: "text", text: "M6 hex bolt", _meta: { "openai/title": "Hex bolt" } }], { target: "new" });
```

- A text or image block with `_meta["openai/title"]` becomes a removable labeled item.
- `target: "new"` starts a new conversation. Mobile only supports the active one.

## Opening local files

```tsx
const { openaiCapabilities } = useHost();
const openFile = useOpenFile();
if (openaiCapabilities.files) {
  openFile("/workspace/parts/hex-bolt.stl");
}
```

Needs ChatGPT desktop, with a path on the machine that runs it. `openFile` rejects elsewhere.

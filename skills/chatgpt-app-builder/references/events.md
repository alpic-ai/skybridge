# Events (experimental)

React to activity in the app without the user → `registerEvent`, `app.emit`

```ts
server.registerEvent(
  {
    name: "comment.created",
    description: "Fires when someone comments on a document",
    inputSchema: { documentId: z.string() },
    payloadSchema: { documentId: z.string(), excerpt: z.string() },
  },
  { match: (event, { arguments: args }) => event.data.documentId === args.documentId },
);

await app.emit("comment.created", { id: comment.id, data: { documentId, excerpt } });
```

- MCP Events is a draft from the MCP Triggers & Events working group. ChatGPT supports it through webhooks, in Work chats: the user asks ChatGPT to watch for an event and says what to do when it fires.
- Requires `oauth`. Keep payloads small (256 KiB max) and expose a tool to fetch details.
- Subscriptions live in memory by default; pass `events: { store }` to `Skybridge` when running several instances.

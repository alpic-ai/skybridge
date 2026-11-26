# Events (experimental)

React to activity in the app without the user → `registerEvent`, `deliverEvent`

```ts
server.registerEvent(
  {
    name: "comment.created",
    description: "Fires when someone comments on a document",
    inputSchema: { documentId: z.string() },
    payloadSchema: { documentId: z.string(), excerpt: z.string() },
  },
  {
    onSubscribe: ({ documentId }, { subscription }) =>
      webhooks.upsert({ ...subscription, filter: { documentId } }),
    onUnsubscribe: (_args, { subscription }) => webhooks.remove(subscription.id),
  },
);

await deliverEvent(subscription, { name: "comment.created", id: comment.id, data: { documentId, excerpt } });
```

- MCP Events is a draft from the MCP Triggers & Events working group. ChatGPT supports it through webhooks, in Work chats: the user asks ChatGPT to watch for an event and says what to do when it fires.
- Skybridge handles subscribing (auth, arguments, callback verification) and passes `{ id, url, secret, expiresAt }` to `onSubscribe`. Whatever knows when events happen delivers them, with `deliverEvent` or its own signed webhooks.
- Requires `oauth`. Keep payloads small (256 KiB max) and expose a tool to fetch details.

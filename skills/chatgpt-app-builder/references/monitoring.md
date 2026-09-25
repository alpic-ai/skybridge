# Monitoring

Monitoring is optional. Do not add it by default just because a project uses Skybridge.

Use this reference only when the user explicitly asks for:
- user insights or user intents
- user feedback collection
- analytics for what users are asking for
- product-learning or monitoring loops

Both middlewares ship in the same package, `@alpic-ai/insights`. Register them with `mcpMiddleware()` any time before `run()` (registering after `run()` or `connect()` throws). Their relative order does not matter.

```ts
import { feedbackMiddleware, intentMiddleware } from "@alpic-ai/insights";
import { McpServer } from "skybridge/server";

const server = new McpServer(
  { name: "my-mcp-server", version: "1.0.0" },
  { capabilities: {} },
)
  .mcpMiddleware(intentMiddleware())
  .mcpMiddleware(feedbackMiddleware())
  .registerTool(/* ... */);
```

Register only the middleware the user asked for.

## User Insights

`intentMiddleware()` injects a `user_intent` argument into the listed tools, which the LLM fills in from the user's own message.

- Docs: <https://docs.alpic.ai/monitoring/user-intents>
- Options:
  - `tools`: array of tool names to restrict capture to; all other tools are left untouched
  - `argumentNameOverride`: maps a tool name to one of its existing arguments (e.g. `{ "search-products": "query" }`) captured as the intent, so no synthetic `user_intent` is injected for that tool

## User Feedback

`feedbackMiddleware()` adds a `send_feedback` tool that the user or the LLM can call. It has no server-side handler: the middleware answers the call itself.

- Docs: <https://docs.alpic.ai/monitoring/user-feedbacks>

Keep this section light in app planning. Monitoring is an add-on, not a required architecture step.

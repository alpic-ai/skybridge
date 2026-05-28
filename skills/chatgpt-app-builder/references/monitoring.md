# Monitoring

Monitoring is optional. Do not add it by default just because a project uses Skybridge.

Use this reference only when the user explicitly asks for:
- user insights or user intents
- user feedback collection
- analytics for what users are asking for
- product-learning or monitoring loops

## User Insights

To capture user intents in a Skybridge server, wire Alpic's insights middleware into the server before tool/widget registration.

- Docs: <https://docs.alpic.ai/monitoring/user-intents>
- Package: `@alpic-ai/insights`
- Middleware: `intentMiddleware()`

```ts
import { intentMiddleware } from "@alpic-ai/insights";
import { McpServer } from "skybridge/server";

const server = new McpServer(
  { name: "my-mcp-server", version: "1.0.0" },
  { capabilities: {} },
)
  .mcpMiddleware(intentMiddleware())
  .registerTool(/* ... */);
```

Useful options called out in the docs:
- `tools`: restrict capture to specific tools
- `argumentNameOverride`: reuse an existing field such as `query` or `question` instead of injecting `user_intent`

## User Feedback

To collect feedback from users or the LLM in a Skybridge server, wire Alpic's feedback middleware into the server before tool/widget registration.

- Docs: <https://docs.alpic.ai/monitoring/user-feedbacks>
- Package: `@alpic-ai/feedback`
- Middleware: `feedbackMiddleware()`

```ts
import { feedbackMiddleware } from "@alpic-ai/feedback";
import { McpServer } from "skybridge/server";

const server = new McpServer(
  { name: "my-mcp-server", version: "1.0.0" },
  { capabilities: {} },
)
  .mcpMiddleware(feedbackMiddleware())
  .registerTool(/* ... */);
```

## Combining Both

If the user asks for both, register both middlewares before tool/widget registration.

```ts
import { feedbackMiddleware } from "@alpic-ai/feedback";
import { intentMiddleware } from "@alpic-ai/insights";
import { McpServer } from "skybridge/server";

const server = new McpServer(
  { name: "my-mcp-server", version: "1.0.0" },
  { capabilities: {} },
)
  .mcpMiddleware(feedbackMiddleware())
  .mcpMiddleware(intentMiddleware())
  .registerTool(/* ... */);
```

Keep this section light in app planning. Monitoring is an add-on, not a required architecture step.

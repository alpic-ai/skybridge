# @skybridge/test

Evals for [Skybridge](https://skybridge.tech) MCP apps: they answer whether a
prompt reaches the right tool with the right arguments, which no unit test can
check.

Add the `evals` option to the Skybridge Vite plugin, then write scenarios with
vitest's own `it` and `expect`.

```ts
import { anthropic } from "@ai-sdk/anthropic";
import { expect, it } from "vitest";
import { start } from "@skybridge/test";
import type { AppType } from "../src/server.js";

it("finds products by category", async () => {
  const chat = await start<AppType>({ model: anthropic("claude-sonnet-4-5") });
  await chat.send("I am looking for ski goggles");

  expect.chat(chat).toHaveCalledToolWith("search-products", {
    category: "goggles",
  });
});
```

## Choosing a model

`start` takes any AI SDK model instance, so the provider and its credentials
are the project's own. Install the provider package you want alongside `ai`.

```ts
import { anthropic } from "@ai-sdk/anthropic";
import { start } from "@skybridge/test";

const chat = await start<AppType>({ model: anthropic("claude-sonnet-4-5") });
```

A local runtime or a company gateway works the same way, through the AI SDK's
own `createOpenAICompatible` or `customProvider`.

```ts
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const ollama = createOpenAICompatible({
  name: "ollama",
  baseURL: "http://localhost:11434/v1",
});
const chat = await start<AppType>({ model: ollama("llama3.1") });
```

## Booting the server

```ts
skybridge({
  evals: { project: { cwd: ".", command: ["node", "dist/server.js"] } },
});
```

`command` has to start the server process directly, since wrappers such as
`pnpm run` do not forward the channel the runner uses to learn the port.

Assertions on what the assistant said work the same way, though model prose
varies between runs, so keep them loose.

```ts
expect.chat(chat).toHaveSaid("in stock");
expect.chat(chat).not.toHaveSaid("refund");
```

See the [documentation](https://docs.skybridge.tech) for setup and the full
matcher list.

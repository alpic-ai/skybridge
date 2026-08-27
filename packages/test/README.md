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

## In-process mode

Pass the app itself instead of booting a server. `start` then dials
`app.fetchHandler` directly, and the tool names and argument shapes come from
the app value, so no type parameter is needed.

```ts
import { anthropic } from "@ai-sdk/anthropic";
import { expect, it } from "vitest";
import { start } from "@skybridge/test";
import { app } from "../src/server.js";

it("finds products by category", async () => {
  const chat = await start({ app, model: anthropic("claude-sonnet-4-5") });
  await chat.send("I am looking for ski goggles");

  expect.chat(chat).toHaveCalledToolWith("search-products", {
    category: "goggles",
  });
});
```

Prefer it whenever you can: there is no child process and no plugin config, so
it runs anywhere vitest does. The caveat is that it bypasses the Express layer,
so nothing verifies a bearer token; pass `authInfo` to claim an identity, or use
the process mode above when the evals must go through real tokens.

### Authenticated evals

```ts
const chat = await start({
  app,
  model: anthropic("claude-sonnet-4-5"),
  authInfo: {
    token: "eval-token",
    clientId: "eval-client",
    scopes: ["checkout"],
    extra: { sub: "user_123", email: "ada@example.com" },
  },
});
```

`authInfo` injects a claimed identity: the app's own scheme and scope
enforcement runs for real, in-band challenges included, and only token
signature verification is skipped. Omit it to eval the anonymous path, which is
how you assert that a protected tool challenges instead of running.

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
  evals: { project: { cwd: ".", command: ["node", "dist/index.js"] } },
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

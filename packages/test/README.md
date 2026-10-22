# @skybridge/test

Evals for [Skybridge](https://skybridge.tech) MCP Apps: they answer whether a
prompt reaches the right tool with the right arguments, which no unit test can
check.

Add the `evals` option to the Skybridge Vite plugin so `expect.chat` exists,
then write scenarios with vitest's own `it` and `expect`. Pass a reusable
`defineServer` definition to `start`: each conversation owns an in-process
execution, and tool names and argument shapes come from the definition.

```ts
import { anthropic } from "@ai-sdk/anthropic";
import { expect, it } from "vitest";
import { start } from "@skybridge/test";
import { service } from "../src/server.js";

it("finds products by category", async () => {
  const chat = await start({ server: service, model: anthropic("claude-sonnet-4-5") });
  await chat.send("I am looking for ski goggles");

  expect.chat(chat).toHaveCalledToolWith("search-products", {
    category: "goggles",
  });
});
```

Host the same definition with `new Skybridge({ server: service, oauth })`.
Evals exercise MCP behavior and middleware, while the HTTP host owns Express
routes and bearer-token verification. `start({ app, model })` remains a shorthand
for an independent execution of `app.server`.

Setup runs once per conversation, with fresh SDK instances for stateless
requests. `chat.close()` closes its session, attachment downloads, and execution,
then invokes the definition's `dispose` once. Test teardown closes it automatically;
startup failures also release completed setup. Keep mutable state in `setup`.

## Authenticated evals

```ts
const chat = await start({
  server: service,
  model: anthropic("claude-sonnet-4-5"),
  authInfo: {
    token: "eval-token",
    clientId: "eval-client",
    scopes: ["checkout"],
    extra: { sub: "user_123", email: "ada@example.com" },
  },
});
```

`authInfo` injects a claimed identity: the definition's explicit scheme and scope
enforcement runs for real, in-band challenges included, and only token
signature verification is skipped. Omit it to eval the anonymous path, which is
how you assert that a protected tool challenges instead of running.

## Choosing a model

`start` takes any AI SDK model instance, so the provider and its credentials
are the project's own. Install the provider package you want alongside `ai`.

```ts
import { anthropic } from "@ai-sdk/anthropic";
import { start } from "@skybridge/test";

const chat = await start({ server: service, model: anthropic("claude-sonnet-4-5") });
```

A local runtime or a company gateway works the same way, through the AI SDK's
own `createOpenAICompatible` or `customProvider`.

```ts
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const ollama = createOpenAICompatible({
  name: "ollama",
  baseURL: "http://localhost:11434/v1",
});
const chat = await start({ server: service, model: ollama("llama3.1") });
```

The plugin's `evals` option also carries the defaults every conversation starts
from, so a project can set them once instead of per scenario.

```ts
skybridge({ evals: { temperature: 0, maxSteps: 6 } });
```

## Input files

`chat.send` also accepts AI SDK `UserContent`. Attach a `FilePart` and use the same object in `expect.inputFile` to check which file a tool received:

```ts
import { readFile } from "node:fs/promises";
import type { FilePart } from "ai";

const portrait: FilePart = {
  type: "file",
  mediaType: "image/png",
  filename: "photo.png",
  data: await readFile(new URL("./fixtures/photo.png", import.meta.url)),
};

await chat.send([{ type: "text", text: "Resize this photo" }, portrait]);

expect.chat(chat).toHaveCalledToolWith("image_crop_and_resize", {
  file: expect.inputFile(portrait),
});
expect.chat(chat).toHaveCalledToolOnce("asset_openai_file_upload", {
  files: [expect.inputFile(portrait)],
});
```

`file` and `files` must be listed in their tools' `_meta["openai/fileParams"]`.
Misplaced file matchers throw immediately, including nested matchers and `.not`.
`start` validates that each declared parameter uses `FileRef`, including optional, nullable, and array forms. It derives an immutable definition with outer native `mcpMiddleware`, exposing paths to the model and resolving them before application middleware, handlers, or stubs run. Application list middleware sees original schemas. Stubs replace only terminal implementations, retaining input validation and authorization. `chat.toolCalls` records resolved arguments; model history retains paths.
See [Evals](https://docs.skybridge.tech/test/evals) for how files reach the model and the tool.

## Matchers

Assertions on what the assistant said work the same way, though model prose
varies between runs, so keep them loose.

```ts
expect.chat(chat).toHaveSaid("in stock");
expect.chat(chat).not.toHaveSaid("refund");
```

See the [documentation](https://docs.skybridge.tech) for setup and the full
matcher list.

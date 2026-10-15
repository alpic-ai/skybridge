# @skybridge/test

Evals for [Skybridge](https://skybridge.tech) MCP Apps: they answer whether a
prompt reaches the right tool with the right arguments, which no unit test can
check.

Add the `evals` option to the Skybridge Vite plugin so `expect.chat` exists,
then write scenarios with vitest's own `it` and `expect`. Pass the app itself
to `start`: it is served in-process, dialing an in-process handler built on `app.createServerInstance()`, and
the tool names and argument shapes come from the app value, so no type
parameter is needed.

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

There is no child process and no server to boot, so the evals run anywhere
vitest does. The caveat is that they bypass the Express layer, so nothing
verifies a bearer token; pass `authInfo` to claim an identity.

## Authenticated evals

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

const chat = await start({ app, model: anthropic("claude-sonnet-4-5") });
```

A local runtime or a company gateway works the same way, through the AI SDK's
own `createOpenAICompatible` or `customProvider`.

```ts
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const ollama = createOpenAICompatible({
  name: "ollama",
  baseURL: "http://localhost:11434/v1",
});
const chat = await start({ app, model: ollama("llama3.1") });
```

The plugin's `evals` option also carries the defaults every conversation starts
from, so a project can set them once instead of per scenario.

```ts
skybridge({ evals: { temperature: 0, maxSteps: 6 } });
```

## Input files

`chat.send` also accepts AI SDK `UserContent`. Attach a `FilePart` and use the
same object in `expect.inputFile` to check which file a tool received:

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

The example assumes `file` and `files` are declared in their tools'
`_meta["openai/fileParams"]`. The model sees each attachment's name, synthetic
absolute workspace path, and content. Declared file fields appear as path strings
or arrays of path strings. The host turns the selected paths into OpenAI file
objects before the handler or stub runs. The local download URLs serve the
attached bytes until the conversation closes; paths are host-local identifiers
and do not require files on disk.

`expect.inputFile(part)` accepts that file's path, id, URL, file object, or an array
containing one of them. Distinct file objects never match each other, even with
identical bytes. It works with both tool argument matchers and their `.not` forms.

Using it for a parameter not listed in `openai/fileParams` throws immediately,
including nested matchers and negative assertions. Ordinary URL parameters remain
plain strings and do not receive automatic file conversion or attachment URLs.

## Matchers

Assertions on what the assistant said work the same way, though model prose
varies between runs, so keep them loose.

```ts
expect.chat(chat).toHaveSaid("in stock");
expect.chat(chat).not.toHaveSaid("refund");
```

See the [documentation](https://docs.skybridge.tech) for setup and the full
matcher list.

# @skybridge/test

Evals for [Skybridge](https://skybridge.tech) MCP apps: they answer whether a
prompt reaches the right tool with the right arguments, which no unit test can
check.

**Beta.** The API is still settling, so it publishes under the `beta`
dist-tag and may change between releases.

Add the `evals` option to the Skybridge Vite plugin, then write scenarios with
vitest's own `it` and `expect`.

```ts
import { expect, it } from "vitest";
import { start } from "@skybridge/test";
import type { AppType } from "../src/server.js";

it("finds products by category", async () => {
  const chat = await start<AppType>();
  await chat.send("I am looking for ski goggles");

  expect.chat(chat).toHaveCalledToolWith("search-products", {
    category: "goggles",
  });
});
```

## Choosing a model

`model` is a `provider/model-id` string. Only the provider you name is
imported, so install just that one as a dev dependency, and the key is read
from its own environment variable.

| prefix | package | key |
| --- | --- | --- |
| `anthropic` | `@ai-sdk/anthropic` | `ANTHROPIC_API_KEY` |
| `openai` | `@ai-sdk/openai` | `OPENAI_API_KEY` |
| `mistral` | `@ai-sdk/mistral` | `MISTRAL_API_KEY` |
| `google` | `@ai-sdk/google` | `GOOGLE_GENERATIVE_AI_API_KEY` |

```ts
skybridge({
  evals: {
    model: "anthropic/claude-sonnet-4-5",
    project: { cwd: ".", command: ["node", "dist/server.js"] },
  },
});
```

`command` has to start the server process directly, since wrappers such as
`pnpm run` do not forward the channel the runner uses to learn the port.

Any other prefix is passed to the AI SDK untouched, so a string such as
`openai/gpt-5` also resolves through the Vercel AI Gateway if you have
`AI_GATEWAY_API_KEY` set and no provider package installed.

## Models the prefixes cannot reach

For a local runtime, a company gateway, or a model that needs middleware,
build the model yourself and register it from a vitest setup file. It takes
precedence over `model`, which can then be left out.

```ts
// eval-model.ts
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { defineEvalModel } from "@skybridge/test";

defineEvalModel(
  createOpenAICompatible({ baseURL: "http://localhost:11434/v1" })("llama3.1"),
);
```

```ts
// vitest.config.ts
export default defineConfig({
  plugins: [skybridge({ evals: { project: { ... } } })],
  test: { setupFiles: ["./eval-model.ts"] },
});
```

See the [documentation](https://docs.skybridge.tech) for setup and the full
matcher list.

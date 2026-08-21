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

See the [documentation](https://docs.skybridge.tech) for setup and the full
matcher list.

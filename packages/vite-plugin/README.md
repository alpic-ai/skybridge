# @skybridge/vite-plugin

The Vite plugin behind [Skybridge](https://skybridge.tech): it discovers view
modules, serves them as virtual entries, applies the `data-llm` transform, and
tells `skybridge build` which packages to leave unbundled.

Projects created with `npm create skybridge` already have it wired up.

```ts
import { defineConfig } from "vite";
import { skybridge } from "@skybridge/vite-plugin";

export default defineConfig({
  plugins: [skybridge()],
});
```

See the [documentation](https://docs.skybridge.tech) for the options it accepts.

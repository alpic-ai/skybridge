# Migrate an existing app to Skybridge v2

Use this when upgrading from Skybridge `1.x`. The breaking changes landed in [v2.0.0](https://github.com/alpic-ai/skybridge/releases/tag/v2.0.0). A greenfield app scaffolded from the current templates already has everything below correct; these gotchas apply to migrators carrying over their own server file and config.

Read the release notes first: they say what changed and why. This guide says how to change it and how to know it worked, so it carries the failure symptoms, the order of operations and the traps that only show up mid-migration. Verify against the installed package rather than guessing when something does not match: grep its dist types (`node_modules/skybridge/dist/server/app.d.ts`, `dist/server/server.d.ts`, `dist/web/index.d.ts`), or run `npm pack skybridge@<version>` to read them before installing.

v2 is built on MCP SDK v2 and the `2026-07-28` protocol revision. The single largest change is structural: the long-lived `McpServer` singleton is gone, replaced by a `Skybridge` app whose `handler` runs for every request.

## Step 1: Mechanical renames

| v1 | v2 |
|----|----|
| `new McpServer(info, options, skybridgeOptions)` | `new Skybridge({ ...info, ...options, ...skybridgeOptions, handler })` |
| `import { skybridge } from "skybridge/vite"` | `import { skybridge } from "@skybridge/vite-plugin"` |
| `export default await server.run()` in `src/server.ts` | `export default await app.run()` in a new `src/index.ts` |
| `export type AppType = typeof server` | `export type AppType = typeof app` |
| `useHostInfo()` | `useHost()` |
| `const { theme, maxHeight, safeArea } = useLayout()` | `const { theme } = useUser()` + `const { maxHeight, safeArea } = useViewport()` |
| `const { download } = useDownload()` | `const download = useDownload()` |
| `LayoutState` | `ViewportState` |
| `throw new InvalidTokenError(msg)` | `throw new OAuthError("invalid_token", msg)` |
| `oauth: { verify: { jwksUri, issuer, audience } }` | `oauth: { verifier: createJwksVerifier({ jwksUri, issuer, audience }) }` |
| `registerTool("name", config, handler)` | `registerTool({ name: "name", ...config }, handler)` |

Three of these are not pure 1:1 renames:

- `useLayout` split along how often values change, not arbitrarily. `theme` is a user preference that rarely changes and now sits in `useUser` next to `locale` and `userAgent`; `maxHeight` and `safeArea` are viewport geometry that changes on every resize and now sit in `useViewport`. A view that only needs `theme` no longer re-renders on resize.
- The `registerTool` 3-argument overload was already deprecated in 1.x and is now deleted, so tools you never touched during the v1 migration can still be on the old form.
- `oauth`, `json` and `skills` move **into** the single config object, next to the new `setup` and `handler` fields. The constructor takes exactly one argument.

## Step 2: The parts that go wrong

Each of these either blocks a working build or silently changes runtime behaviour, and most of them fail with a symptom that points away from the cause.

### 2.1 The handler must return the chained server

`Skybridge` takes one config object. Its required `handler` field receives a fresh `McpServer` and must **return** the result of the `registerTool` chain. That return value is what carries your tool types into `typeof app`.

```ts
// src/server.ts
import { Skybridge } from "skybridge/server";
import * as z from "zod";

export const app = new Skybridge({
  name: "my-app",
  version: "1.0.0",
  capabilities: {},
  handler: (server) =>
    server
      .registerTool({ name: "search", inputSchema: { query: z.string() } }, searchHandler)
      .registerTool({ name: "book", inputSchema: { id: z.string() } }, bookHandler),
});

export type AppType = typeof app;
```

Write the handler as an expression body (`(server) => server.registerTool(...)`) so the return is structural and cannot be forgotten. With a block body, a missing `return` fails to compile at the `new Skybridge(...)` call (`Type 'void' is not assignable to type 'McpServer<…>'`).

When the handler is extracted into its own declaration, annotate its parameter with `SkybridgeServer` from `skybridge/server`, the bare server it receives. It takes the claims your OAuth verifier produces, which types `extra.http.authInfo.extra` in tool handlers. When `oauth` is set on the same config, the claims are inferred from the provider and the annotation is unnecessary:

```ts
export const handler = (server: SkybridgeServer<{ email?: string }>) =>
  server.registerTool({ name: "search", ... }, searchHandler);

export const app = new Skybridge({ ...config, handler });
```

Leave the handler's return type inferred: the returned chain is what carries the tool registry into `typeof app`.

### 2.2 The handler runs on every request, so it must be pure

The release notes cover this too. It is repeated here because it is the change most likely to take down a migrated app in production, and neither the compiler nor a manual test through devtools will catch it.

The handler runs once when the app is first used (at `run()` or on the first request, so registration errors surface at boot and OAuth learns each tool's security schemes) and then **again for every single HTTP request**, because the per-request server instance is what the SDK stamps with the negotiated protocol version. Skybridge warns on the console when a handler takes more than 50ms.

Anything in the handler body other than registration therefore executes per request:

```ts
// WRONG: one pool and one timer per request
export const app = new Skybridge({
  ...config,
  handler: (server) => {
    const pool = new pg.Pool();
    setInterval(refreshCache, 60_000);
    return server.registerTool(...);
  },
});
```

Under load this opens connection pools and accumulates timers until the process dies. Hoist every side effect to module scope, above the `new Skybridge(...)` call, and let the handler close over it:

```ts
// RIGHT
const pool = new pg.Pool();
setInterval(refreshCache, 60_000);

export const app = new Skybridge({ ...config, handler: (server) => server.registerTool(...) });
```

The same applies to anything expensive but harmless: file reads, config parsing, client construction, `await`ed setup. Registration is the only work that belongs inside.

When registration itself depends on `await`ed data (remote config, secrets), put that work in `setup`. It runs once, at `run()` or on the first request and never at module import, so importing `server.ts` from tests and evals stays side-effect free. Its awaited result is passed to the handler as the second argument. The handler itself stays synchronous:

```ts
export const app = new Skybridge({
  ...config,
  setup: async () => loadConfig(),
  handler: (server, cfg) => server.registerTool({ name: cfg.toolName, ... }, handler),
});
```

The `oauth` field accepts an `OAuthConfig`, a promise of one, or a function of the `setup` result. Prefer the function form when building the config has side effects (the branded providers perform network discovery):

```ts
export const app = new Skybridge({
  ...config,
  setup: async () => loadConfig(),
  oauth: (cfg) => descopeProvider({ url: cfg.mcpServerUrl }),
  handler: (server, cfg) => server.registerTool(...),
});
```

**If you are an agent performing this migration**, this is the one step you cannot do by shape-preserving edit. The mechanical move is to wrap the old file's contents in the handler, and that is exactly what produces the bug, because in v1 those statements ran once at module scope.

Go through the v1 server file statement by statement before you move anything. Only `registerTool`, `registerResource`, `registerPrompt` and `mcpMiddleware` calls belong inside the handler. Everything else stays at module scope (or in `setup`), above the `new Skybridge(...)` call:

- database pools, HTTP clients, SDK clients, caches
- `setInterval` / `setTimeout`
- file and config reads, `await`ed initialization
- anything that opens a connection, spawns work, or allocates something you would not want one of per request

Anything that reads module state but creates nothing (a lookup, a branch on an env var) is safe either way; prefer module scope anyway.

When a statement is ambiguous, a helper call whose body you cannot see, a factory function from the user's own code, an import with side effects, **stop and ask the user** whether it is safe to run once per request, rather than guessing. Getting this wrong produces an app that passes every check and falls over in production, so a question here is cheaper than the alternative.

### 2.3 The entry file moves to `src/index.ts`

v1 ran `dist/server.js` and the entry had to be `src/server.ts`. v2 runs `dist/index.js`. Keep `src/server.ts` for the app definition and add a new `src/index.ts` that runs it:

```ts
// src/index.ts
import { app } from "./server.js";

export default await app.run();
```

`src/server.ts` must now export `app` rather than default-exporting the result of `run()`. `tsc`, `skybridge build` and `skybridge dev` all pass whatever you do here; only `skybridge start` fails, and only in production, with a missing-entry error that does not mention the filename convention.

### 2.4 `mcpMiddleware` chains inside the handler

Middleware was registered on the singleton in v1. It is per-instance state now, so it belongs in the chain the handler returns:

```ts
export const app = new Skybridge({
  ...config,
  handler: (server) =>
    server
      .mcpMiddleware(intentMiddleware())
      .registerTool(...),
});
```

Registering it outside the handler is a compile error, since there is no server object at module scope to call it on. Ordering within the chain is unchanged.

### 2.5 Tool handler `extra` is the SDK's `ServerContext`

Every field a handler read off `extra` moved. This produces a type error at each site, so the compiler finds them for you, but the shape is not guessable:

```ts
// v1
async (args, extra) => {
  const token = extra.authInfo?.token;
  const meta = extra._meta;
  extra.signal.throwIfAborted();
}
```

```ts
// v2
async (args, extra) => {
  const token = extra.http?.authInfo?.token;
  const meta = extra.mcpReq._meta;
  extra.mcpReq.signal.throwIfAborted();
}
```

`signal`, `id`, `notify` and `send` all live under `extra.mcpReq`. The typed ChatGPT client hints stay on `extra.mcpReq._meta`. Note `extra.http` is optional: it is absent for non-HTTP transports, so the `?.` is load-bearing rather than defensive.

### 2.6 The Vite plugin is a separate package you must install

`skybridge/vite` no longer exists as a subpath. Add the package to `devDependencies`:

```json
"devDependencies": { "@skybridge/vite-plugin": "^2.0.0" }
```

The v1 split still holds: `@skybridge/vite-plugin` is build-time Node code for your Vite config, while every React hook stays in `skybridge/web`. Do not blanket-rename imports.

### 2.7 Drop `@modelcontextprotocol/sdk` from your dependencies

SDK v1 is no longer a peer dependency of `skybridge`. Remove it from your app's `package.json`. Anything you imported from it comes from `skybridge/server` now, e.g. `McpExtra` for typing extracted handlers. For schema types, use the SDK's `StandardSchemaWithJSON` / `StandardSchemaV1.InferOutput` directly: earlier v2 alphas exported `RawInputShape` and `InferSchemaOutput` aliases, which are gone.

Leaving the old dependency installed is worse than harmless. Your app resolves SDK v1 types while `skybridge` is built against v2, and the resulting mismatch surfaces as structurally-identical types that refuse to unify.

### 2.8 Bump `@skybridge/devtools` in lockstep

`skybridge` v2 peer-depends on `@skybridge/devtools` v2. A v1 project pins `^1.x`, so an install after the upgrade reports an unmet peer and devtools may fail to start against the new server. Bump both together, to the same version.

### 2.9 `useToolInfo` has no idle state

`ToolIdleState` and the `isIdle` field are gone from every member of the state union. `status` starts at `"pending"`, which is what it did at runtime in v1 as well; only the type was lying.

```tsx
// v1
const { isIdle, isPending, output } = useToolInfo("search");
if (isIdle) return <Empty />;
```

```tsx
// v2
const { isPending, output } = useToolInfo("search");
if (isPending) return <Skeleton />;
```

Any `isIdle` branch was dead code. Delete it rather than remapping it to `isPending`, or you will render a loading state where you used to render an empty one.

### 2.10 Schemas accept any Standard Schema validator

`inputSchema` and `outputSchema` are no longer zod-specific. Nothing changes if you keep zod, and there is no reason to switch during a migration.

One exception runs the other way: tools registered from inside a view via `useRegisterViewTool` are typed zod-only (`ViewToolInputShape`), because the bridge validates arguments with `z.object()` at runtime. Server-side schemas are unconstrained; view-side ones are not.

### 2.11 `ViewConfig.hosts` and `ViewHostType` are gone

`hosts` was already a no-op in 1.x, since every view emits a single ext-apps resource. Delete the field. `ViewHostType` is gone, and the served view page no longer declares `hostType` on `window.skybridge`. The runtime is detected at load time via `window.openai`, so a view reading `window.skybridge.hostType` should drop the check.

### 2.12 `app.fetchHandler` is gone; `createServerInstance()` is async

The HTTP surface an app exposes is the Express listener (`app.run()` / `app.express`). Code that dialed `app.fetchHandler` directly builds its own handler instead: `createMcpHandler(() => app.createServerInstance())` from `@modelcontextprotocol/server`. `createServerInstance()` now returns a promise, since it resolves `setup` and the `oauth` input on first use, so `await` it where v2 alphas called it synchronously.

## Step 3: Version strategy

During the beta, pin the **exact** version rather than a range:

```json
"skybridge": "2.0.0-beta.<sha>",
"@skybridge/vite-plugin": "2.0.0-beta.<sha>",
"@skybridge/devtools": "2.0.0-beta.<sha>"
```

Beta versions are suffixed with a commit sha, not an incrementing index, so semver cannot order them: `2.0.0-beta.a1b2c3d` and `2.0.0-beta.deed804` compare lexically and a `^` range resolves to the alphabetically highest, which is not the newest. A range will silently pin you to an arbitrary beta and stay there.

Install the current beta with the dist-tag (`npm i skybridge@beta`), then replace the range npm writes into `package.json` with the exact version it resolved. To move to a newer beta, re-run the tagged install deliberately.

Once 2.0.0 is released, switch all three to `^2.0.0` and re-validate.

## Step 4: Validate (a green build is not enough)

Using the project's configured package manager, run in order:

1. Install dependencies, and confirm no unmet peer warnings for `@skybridge/devtools` or `@skybridge/vite-plugin`.
2. `tsc --noEmit`. This catches the handler return, the `extra` reshape, and every removed export.
3. `skybridge build`.
4. `skybridge start`, not just `skybridge dev`. This is the only step that exercises the `dist/index.js` entry from 2.3.
5. `skybridge dev`, then **open the view in devtools** and confirm it renders.

Two failure modes here are invisible to a typecheck. A missing `src/index.ts` passes every check except `skybridge start`. An impure handler (2.2) passes everything, including a manual click through devtools, and only fails under sustained traffic. If your handler does anything beyond registration, re-read 2.2 before shipping.

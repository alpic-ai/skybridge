# Migrate an existing app to Skybridge v1

Use this when upgrading from Skybridge `< 0.36.x`. The breaking changes first landed in [v0.36.0](https://github.com/alpic-ai/skybridge/releases/tag/v0.36.0) and were restated in [v1.0.0](https://github.com/alpic-ai/skybridge/releases/tag/v1.0.0); users might refer to `0.36.x+` as "v1". A greenfield app scaffolded from the current example apps already has everything below correct; these gotchas apply to migrators who carry over their own config.

Read the release notes first: they are the fastest source. Use this guide for the parts the notes get wrong or leave out. When a note is imprecise, defer to this document and verify against the installed package instead of guessing: grep its dist types (`node_modules/skybridge/dist/web/index.d.ts`, `dist/server/server.d.ts`, `dist/web/plugin/scan-views.js`), or run `npm pack skybridge@<version>` to read them before installing.

## Step 1 — Mechanical renames (the notes are to be trusted here)

These are exactly as documented. Apply them verbatim:

| v0 | v1 |
|----|----|
| `registerWidget("name", viewMeta, toolDef, handler)` | `registerTool({ name, ...toolDef, view: {...} }, handler)` |
| `mountWidget(<View />)` at end of view file | delete it — views auto-mount from `src/views/` |
| `useWidgetState` | `useViewState` |
| `widgetsDevServer` | `viewsDevServer` |
| `server/` + `web/` split | flat `src/` with `src/views/` |
| `return { ..., result }` in tool response | remove the `result` field — dropped from `CallToolResponse` (keep `isError`, see below) |

Two of these are not pure 1:1 renames:
- `useViewState`'s return type depends on whether you pass a default: with one it is `[T, …]`, without it is `[T | null, …]`. `useWidgetState` was always nullable, so the swap can change your state type.
- Only the Skybridge-specific `result` field was dropped, **not** `isError`. `isError` is part of the MCP `CallToolResult` and is still how you flag a failed call. Keep returning `isError: true` on error paths (or `throw` inside the handler — the SDK catches it and sets `isError: true` for you). If you drop `isError` from an error response, the missing field defaults to `false` and the host treats the failure as a successful result.

## Step 2 — What the notes omit

Each of these blocks a working build, and several fail with error messages that point away from the actual cause.

### 2.1 The `skybridge/web` → `skybridge/vite` rename is only the Vite plugin

The notes show `import { skybridge } from "skybridge/web"` → `"skybridge/vite"` and read like a blanket rename. It is not. **Only the Vite plugin moved.** Every React hook still lives in `skybridge/web`. The split is by runtime: `skybridge/vite` is build-time Node code (the plugin runs in your Vite config), while `skybridge/web` is browser code that ships to the view — so a blanket rename moves browser hooks into a module the browser bundle can't resolve.

```ts
// vite.config.ts — the ONLY thing that moves to skybridge/vite
import { skybridge } from "skybridge/vite";

// helpers.ts and views — hooks stay in skybridge/web
import { generateHelpers, useDisplayMode, useSendFollowUpMessage, useViewState } from "skybridge/web";
```

`useToolInfo` / `useCallTool` are a special case: you don't import them from `skybridge/web` at all — they come from your local `helpers.ts` via `generateHelpers<AppType>()`.

Symptom if you rename them all blindly: `Module '"skybridge/vite"' has no exported member 'generateHelpers'`.

### 2.2 `registerTool` itself changed to a 2-arg signature

The notes only describe `registerWidget` → `registerTool`. They don't say that the *existing* `registerTool` signature also changed. v0 was 3 args `(name, config, handler)`; v1 is 2 args, with the name inside the config object:

```ts
// v0
.registerTool("search", { description, inputSchema }, handler)
// v1
.registerTool({ name: "search", description, inputSchema }, handler)
```

This applies to **every** tool, including data-only ones you didn't otherwise touch. Symptom: `Expected 2 arguments, but got 3`.

### 2.3 A `vite.config.ts` is now required at the project root

The old config lived at `web/vite.config.ts`. When the two-directory layout collapses, that file must move to the **project root** and import the plugin from `skybridge/vite`:

```ts
import react from "@vitejs/plugin-react";
import path from "node:path";
import { skybridge } from "skybridge/vite";
import { defineConfig, type PluginOption } from "vite";

export default defineConfig({
  plugins: [skybridge() as PluginOption, react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

`skybridge()` is the only Skybridge-required plugin; `react()` is standard for views. Keep whatever CSS plugin your v0 config used (`@tailwindcss/vite`, `@vanilla-extract/vite-plugin`, etc.) and add it back exactly as before — don't add one you weren't already using, or Vite fails to resolve the import before the build starts.

The `skybridge build` CLI loads this via Vite's config resolution from the root. Without it the build fails with `Cannot resolve entry module index.html` — an error that says nothing about the actual cause (a missing root config).

### 2.4 View names typecheck via a generated, committed `.skybridge/views.d.ts`

`view.component` is typed as `ViewName`, which is `keyof ViewNameRegistry`. `ViewNameRegistry` ships **empty**, so out of the box `ViewName` is `never` and any `component: "x"` fails. Skybridge fills it by scanning `src/views/` and generating `.skybridge/views.d.ts`, which augments the registry via declaration merging:

```ts
// .skybridge/views.d.ts (generated, commit it — it is NOT gitignored)
declare module "skybridge/server" {
  interface ViewNameRegistry { "show-products": true; }
}
```

For `tsc` to see it, add it to `include` **as an explicit file path** — `["src", ".skybridge/views.d.ts"]`. Listing just `".skybridge"` silently fails to match the dotfile directory, so the augmentation never loads.

Symptom when it's missing: `Type 'string' is not assignable to type 'never'` on `view.component`, which then cascades — `output` in the view infers as `never` and every field access errors. Fix the `views.d.ts` include first and the field-access errors disappear with it — don't chase them individually, they're all downstream of `ViewName` being `never`.

Generate the file by running `skybridge dev` or `skybridge build` once after the views exist.

### 2.5 An extracted tool config needs `as ViewName`

If your `view.component` is written inline in the `registerTool({...})` call, it typechecks via contextual typing — no cast. Inline, TypeScript checks the literal against the expected `ViewName` parameter type directly, so it stays a literal; pulled into a standalone `const` with no annotation (a common refactor), it has no expected type to check against and widens to `string`, breaking against `ViewName`. So either annotate the const's type or cast the field:

```ts
const CONFIG = { name: "show-products", view: { component: "show-products" as ViewName } };
```

The view component name is independent of the tool name: it is the kebab-case file or directory in `src/views/` (`get-gas-and-power-quote`), while the tool keeps its own name (`get_gas_and_power_quote`) and the helper generics (`useToolInfo<"get_gas_and_power_quote">`) key off the tool name. Renaming the tool to match the view changes the published MCP tool identity.

### 2.6 View CSP moved to `view.csp`

In v0, CSP was nested under `_meta.ui.csp`. In v1 it is a direct field on `view`:

```ts
view: {
  component: "show-products",
  csp: { resourceDomains: ["https://cdn.example.com"], redirectDomains: ["https://example.com"] },
}
```

No type error if you leave it under `_meta` — the CSP just silently never applies, which surfaces later as blocked images or redirects.

### 2.7 Update tsconfig include and paths

The old `include` and `@/*` path pointed at the split layout. Repoint both at `src`:

```json
{
  "include": ["src", ".skybridge/views.d.ts"],
  "compilerOptions": { "paths": { "@/*": ["./src/*"] } }
}
```

If `include` still names the deleted `server/src` / `web/src`, `tsc` reports `No inputs were found` and silently typechecks nothing — a passing build that verified zero files.

### 2.8 The server entry file must be `src/server.ts`

The flatten in Step 1 collapses `server/` + `web/` into `src/`, and the entry filename matters: v1's production runtime runs `dist/server.js`, so the entry must be `src/server.ts`, not `src/index.ts`. `tsc`, `skybridge build`, and `skybridge dev` pass with any name; only `skybridge start` fails to find the entry. The `start` command's target (`dist/server.js`) is visible in the installed CLI.

### 2.9 Move view providers into the default export

Step 1 removes `mountWidget`. If `mountWidget(<Provider><View /></Provider>)` wrapped the view in a context provider (theme, host detection, store, i18n), auto-mount has no slot for it — it renders the view's default export directly. Move the provider into the default export:

```tsx
export default function MyView() {
  return <HostProvider><MyViewInner /></HostProvider>;
}
```

There is no error if the wrapper is dropped: the provider never mounts and its context falls back to defaults (for example, host detection always reports the default host).

### 2.10 Views can be directories; loose `.tsx` files in `src/views/` are scanned as views

The scanner globs both `src/views/*.{tsx,jsx}` and `src/views/*/index.{tsx,jsx}`, and the view name is the file or directory basename. Two consequences:
- A multi-file view can stay a directory: `src/views/my-view/index.tsx` plus its helper components in the same folder. Siblings of `index.tsx` are not scanned as views, so flattening is not required.
- Helper components placed as loose files directly in `src/views/` are each scanned as a view and added to `ViewNameRegistry` (and can trigger the duplicate-name check). Keep helpers in the view's directory or under `src/components/`.

## Step 3 — Version strategy

Migrate against a **fixed v1 floor first**, so a failure means "my migration is wrong," not "a later 1.x release changed something":

```json
"skybridge": "1.0.0",
"@skybridge/devtools": "1.0.0"
```

Get this fully working and validated (Step 4). Only then bump to the latest `1.x` and re-validate. A 1.x bump is non-breaking by semver but can still change generated output or defaults; re-running Step 4 catches a regression introduced by the bump rather than by your migration. Revert to `1.0.0` if the bump breaks anything — that cleanly separates migration bugs from version-drift bugs.

## Step 4 — Validate (a green build is not enough)

Using the project's configured package manager, run in order:
1. Install dependencies.
2. `tsc --noEmit` — catches the import, `registerTool`, and view-name issues above.
3. `skybridge build`.
4. `skybridge dev`, then **open the view in devtools** and confirm it renders.

A passing typecheck and build prove the app compiles, not that it works: the view can render nothing while both are green (for example, a data-flow mismatch between `structuredContent` and `_meta`). Confirm the view renders before treating the migration as done.

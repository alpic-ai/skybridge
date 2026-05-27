# Bridge refacto design

Date: 2026-05-27
Scope: `packages/core/src/web/bridges/`
Status: design approved, plan pending

## Goal

Collapse the two parallel runtime adaptors (`AppsSdkAdaptor`, `McpAppAdaptor`) into a single composite adaptor with per-method routing.

Treat the MCP App protocol (ext-apps) as the always-present baseline and call `window.openai` only for methods where Apps SDK behavior is materially different or unique. Drop the load-bearing role of `window.skybridge.hostType`; detect available runtimes by probing.

Public API surface (`Adaptor` interface, `getAdaptor`, all React hooks, `createStore`, `mountView`, exported types) stays identical. The refacto is internal-only.

## Motivation

Today the framework picks one adaptor based on `window.skybridge.hostType`. The two adaptors duplicate type definitions, diverge on capability support (file ops only on Apps SDK, `requestSize`/`download` only on MCP App), implement viewState persistence differently (server-side widgetState vs localStorage LRU), and ship inconsistent error contracts (throws, console.errors, silent no-ops). The split also makes "both transports available" scenarios impossible to express, even though that is now the expected runtime shape.

The new model assumes both transports can be present simultaneously and routes each method to the transport that handles it best.

## Per-method routing

Source for these decisions: side-by-side reading of the ext-apps draft spec (`apps.mdx`), the Apps SDK docs at `developers.openai.com/apps-sdk/`, and the current adaptor implementations.

| Method | Routing | Reason |
|---|---|---|
| `callTool` | MCP App | Identical response surface; capability-checked in ext-apps |
| `requestDisplayMode` | MCP App | Stronger spec guarantees (declared-mode enforcement) |
| `requestClose` | MCP App | Has teardown handshake; Apps SDK is fire-and-forget |
| `requestSize` | MCP App | Apps SDK has no equivalent |
| `sendFollowUpMessage` | MCP App; Apps SDK when caller passes `scrollToBottom` | MCP App supports arbitrary role and content blocks; `scrollToBottom` is Apps-SDK-only |
| `openExternal` | MCP App; Apps SDK when caller passes `redirectUrl: false` | Tracking-param opt-out is Apps-SDK-only |
| `setViewState` | Apps SDK when present, else MCP App + localStorage | Apps SDK server-persists across sessions and splits model/private content |
| `openModal` | Apps SDK when present, else MCP App in-iframe polyfill | Apps SDK portals outside iframe; ext-apps spec has no modal primitive |
| `download` | MCP App | Apps SDK has no equivalent for arbitrary view-generated content |
| `uploadFile`, `selectFiles`, `getFileDownloadUrl`, `setOpenInAppUrl` | Apps SDK only | Apps-SDK-exclusive; throw `NotSupportedError` when `window.openai` is absent |
| `getHostContextStore(key)` | Apps SDK when `key in {"display", "viewState"}` and Apps SDK present; else MCP App | Apps SDK is authoritative for host-driven modal state and widgetState |

Out of scope: server-triggered close via `metadata.openai/closeWidget` (Apps SDK only, no MCP equivalent) and the `privateContent` split on `setViewState` (no MCP equivalent and not exposed by current hooks).

## Architecture

One class, `HostAdaptor`, implements the `Adaptor` interface. It holds two raw SDK references:

- `app: App` from the ext-apps SDK. Always instantiated. Owns the JSON-RPC connection over `parent.postMessage`, the App handlers (`ontoolinput`, `ontoolresult`, `onhostcontextchanged`), and the canonical host-context stores.
- `oai: typeof window.openai | null`. Captured once at construction by probing `window.openai`. When present, also drives the `display` and `viewState` host-context stores via the `openai:set_globals` window event.

No intermediate transport wrappers. Each of the 14 `Adaptor` methods encodes its routing rule inline against `this.app` and `this.oai`.

`getAdaptor()` is the memoized factory. On first call it constructs `HostAdaptor` once and caches the instance. It no longer reads `window.skybridge.hostType` to select an implementation. `hostType` stays in `window.skybridge` (the host still injects it; we do not break that contract), but it is informational; if it disagrees with the `window.openai` probe, log a warning and trust the probe.

### File layout

```
packages/core/src/web/bridges/
├── index.tsx                  # public re-exports (unchanged)
├── types.ts                   # Adaptor interface + NotSupportedError + shared types
├── get-adaptor.ts             # memoized factory
├── use-host-context.ts        # unchanged
├── adaptor.ts                 # HostAdaptor class
└── host-context-stores.ts     # store-creation helpers
```

The `apps-sdk/` and `mcp-app/` subdirectories are removed. Their contents are merged into `adaptor.ts` and `host-context-stores.ts`. The MCP App `viewState` localStorage LRU stays as the offline persistence path; it lives inside `adaptor.ts` or a small co-located helper.

## Data flow

### Write path

```
hook (useCallTool, useViewState, useFiles, ...)
  → getAdaptor()                  [memoized; single HostAdaptor]
  → adaptor.<method>(...)         [per-method routing inline]
      ├─ this.app.<...>           [ext-apps JSON-RPC]
      └─ this.oai?.<...>          [window.openai; throws NotSupportedError if null and method requires it]
```

### Read path

```
useHostContext(key)
  → adaptor.getHostContextStore(key)
      ├─ key in {"display", "viewState"} and oai present  → oai-backed store
      └─ otherwise                                         → app-backed store
  → useSyncExternalStore(store.subscribe, store.getSnapshot)
```

Inside ChatGPT (Apps SDK present): `setViewState` writes via `window.openai.setWidgetState`; `getHostContextStore("viewState")` reads from `window.openai.widgetState`. Symmetric. localStorage and `updateModelContext` are not touched for view state.

Outside ChatGPT (MCP-app host only): `setViewState` writes via `updateModelContext` + localStorage LRU; reads via the same localStorage path hydrated by `viewUUID` on tool result. Identical to today's MCP App behavior.

`createStore` is unchanged at the call site. It subscribes to `adaptor.getHostContextStore("viewState")` and calls `adaptor.setViewState(...)` on state changes; it neither knows nor cares which SDK each call lands on.

### Critical assumption

`App` (ext-apps) must establish its JSON-RPC connection successfully even inside ChatGPT. Per the design's runtime-overlap clarification, both transports are always available going forward. If the MCP App connection fails (e.g. an older host), `HostAdaptor` enters a degraded state: methods that route to `this.app` throw `NotSupportedError("…", reason: "MCP transport unavailable")`; Apps-SDK-routed methods still work when `oai` is present. The factory logs a single warning.

## Error handling

A new exported error class `NotSupportedError` lives in `bridges/types.ts`:

```ts
export class NotSupportedError extends Error {
  constructor(public method: string, public reason?: string) {
    super(`${method} is not supported in this runtime${reason ? `: ${reason}` : ""}`);
    this.name = "NotSupportedError";
  }
}
```

Thrown by `HostAdaptor` when an Apps-SDK-exclusive method (`uploadFile`, `selectFiles`, `getFileDownloadUrl`, `setOpenInAppUrl`) is called and `oai` is null. Replaces today's untyped `throw new Error("…not supported…")` strings so views can `instanceof`-check and degrade gracefully.

Construction-time failure modes:

- `window.skybridge` not injected: `getAdaptor()` throws synchronously with a clear message ("Skybridge globals not found; is the view loaded inside a Skybridge host?").
- MCP App connection fails to establish: returns a degraded `HostAdaptor` (see above), single warning logged.
- `hostType` mismatch with probe: log a warning, trust the probe. Not an error.

Method-call failures pass through. The adaptor does not wrap or normalize SDK errors. We stop the current pattern of catching SDK errors and returning `{ isError: true }` (in `download`); the caller gets a real rejection. Hooks decide how to surface that to views.

`requestSize` and `requestDisplayMode` are notifications in ext-apps and never fail; this is documented on their JSDoc.

## Testing

Today's bridge test coverage is one file (`mcp-app/use-mcp-app-context.test.ts`, 32 lines). The refacto adds:

- `adaptor.test.ts`: exercises `HostAdaptor` with `oai` present and absent. Asserts the routing rule for each of the 14 methods, the `NotSupportedError` paths, the `redirectUrl` and `scrollToBottom` overlay conditions, and `getHostContextStore` key-based dispatch. Uses fakes for `App` and `window.openai` injected via constructor.
- `host-context-stores.test.ts`: store hydration from MCP notifications, memoization via dequal, snapshot stability.
- `get-adaptor.test.ts`: memoization, `window.openai` probe, `hostType` mismatch warning, missing-globals error.
- `viewstate-persistence.test.ts`: localStorage LRU behavior in the no-overlay case (200-entry cap, eviction by timestamp, viewUUID-keyed restore).

Existing hook tests (`hooks/use-*.test.ts`) continue to mock the adaptor at the hook level; the routing logic itself is exercised by `adaptor.test.ts`. Hook contracts do not change so no hook test should need rewriting.

End-to-end tests against real ChatGPT or real MCP-app hosts are out of scope for this refacto and belong in devtools or examples.

## Public API delta

Net change to `src/web/index.ts` exports: one addition.

- Added: `NotSupportedError` class (exported from `bridges/types.ts`, re-exported via `bridges/index.tsx`).
- Unchanged: `Adaptor` interface, `getAdaptor`, `useHostContext`, all hooks in `src/web/hooks/`, `createStore`, `mountView`, all user-facing types.

The `Adaptor` interface and `getAdaptor` keep their `@internal` JSDoc tags. Method signatures on `Adaptor` are unchanged.

## Migration of existing references

Internal call sites that touch the old subdirectories:

- `src/web/create-store.ts`, `src/web/data-llm.tsx`, `src/web/helpers/state.ts`, and every file under `src/web/hooks/` already call `getAdaptor()` and use its returned methods only. They require no source change beyond the import path if `Adaptor` moves between files.
- `docs/concepts/write-once-run-everywhere.mdx` contains a Mermaid diagram labelled "Apps SDK Adaptor" and "MCP App Adaptor". Update the diagram to reflect the new single-adaptor architecture.

## Risks and open questions

1. The "both transports available" assumption depends on the ext-apps protocol being live inside ChatGPT. If that is not yet true in production at refacto time, the degraded-state code path becomes the main code path inside ChatGPT and `setViewState` regressions are possible. Mitigation: verify ext-apps connection success rate inside ChatGPT before deployment; if it is not yet universal, ship the refacto behind a feature flag.
2. `openModal` in the MCP App path is an in-iframe polyfill; consumers relying on it should not regress, but the polyfill code path may need cleanup as part of the merge.
3. The `scrollToBottom` and `redirectUrl: false` overlay conditions are subtle. A naive caller passing `scrollToBottom: false` in an MCP-app host today gets the option silently ignored; the new code preserves that behavior but the routing rule is worth documenting on the hook JSDoc.

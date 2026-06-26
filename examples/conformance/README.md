# Skybridge Web Hooks Conformance

A self-testing MCP app built with [Skybridge](https://docs.skybridge.tech/home). It exercises the **web hooks** of `skybridge/web` and reports, member by member, whether each one is **supported on the host it runs on** (ChatGPT / Apps SDK, Claude / MCP Apps, the DevTools emulator, ...).

## How it works

- The app is organized as **hooks → members**. Each hook (e.g. `useLayout`) has one test per member (e.g. `theme`, `maxHeight`, `safeArea`).
- Each member resolves to a support verdict:
  - `supported` — the member does its job on this host.
  - `unsupported` — the host doesn't expose this capability and Skybridge degraded gracefully (a documented no-op / throw / `isError` on the runtime that lacks it). This is still conformant.
  - `error` — it failed unexpectedly (a real problem).
  - `untested` — a manual member not yet run.
- **Two phases:**
  1. **Automated tests run on load.** They run one at a time (so the `useViewState` / `createStore` writes that share a single host `viewState` don't race) and fill in their verdicts. Use "Re-run automated" to run them again.
  2. **A stepper walks the manual tests** — members with a visible or irreversible side effect (downloads, navigation, resize, closing the view, opening a modal, file pickers). Step through them and run each on an explicit action.
- **Results** are a list of hooks, each with a subsection per member showing its support badge and what was observed.

## Hooks covered

`useToolInfo`, `useCallTool`, `useViewState`, `createStore`, `useLayout`, `useUser`, `useDisplayMode`, `useRequestModal`, `useSendFollowUpMessage`, `useFiles`, `useDownload`, `useOpenExternal`, `useRequestSize`, `useRequestClose`, `useSetOpenInAppUrl`, `useRegisterViewTool`, `useHostContext`, `useAppsSdkContext`, `useMcpAppContext`.

The server (`src/server.ts`) registers a small set of tools the automated members call (`echo`, `ping`, `content-showcase`, `with-output-schema`, `accept-file`, `export-report`, ...). `export-report` receives the markdown report so it can be surfaced in the conversation.

## Exporting the report

The header offers three exports, so it works on any host:

- **Send report to chat** — calls the `export-report` server tool, which returns the markdown as message content (works on every runtime).
- **Copy markdown** — writes the report to the clipboard.
- **Download .md** — uses `useDownload` (MCP Apps; on Apps SDK the button reports it is unavailable).

## Getting Started

### Prerequisites

- Node.js 24+

### Local Development

```bash
pnpm install
pnpm dev
```

This starts the MCP server at `http://localhost:3000/mcp` and the Skybridge DevTools UI at `http://localhost:3000/`. Open DevTools and invoke the `conformance` tool.

Note: the DevTools emulator mocks the Apps SDK runtime, so MCP-Apps-only members (downloads, resize, `useMcpAppContext`, `useRegisterViewTool`, ...) report `unsupported` there. Connect a real MCP Apps host (Claude) to see those flip to `supported`.

## Project structure

```
src/
  server.ts                # MCP server + the tools the automated members call
  helpers.ts               # generateHelpers<AppType>() typed hooks
  index.css                # Tailwind + @alpic-ai/ui theme
  views/
    conformance.tsx        # The single view (default export); modal branch + runner
    components/ui.tsx       # Presentational primitives + SupportBadge
  conformance/
    types.ts               # Support / MemberResult / Member / HookDef
    context.tsx            # Provider, reporting hooks (auto / manual), runtime detection
    runner.tsx             # Auto-runner, results list, manual stepper, export
    registry.ts            # The ordered list of hooks under test
    report.ts              # Markdown report builder
    hooks/                 # One file per hook (a HookDef with its members)
```

## Adding a hook or member

1. Open (or add) a file in `src/conformance/hooks/` exporting a `HookDef`.
2. For each member, write a small `Test` component that drives the hook and reports via `useAutoReport` / `useAsyncAuto` (automated) or `useManualRun` (manual).
3. Make sure the `HookDef` is imported and listed in `registry.ts`.

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [mcp-app-conformance](https://github.com/alpic-ai/mcp-app-conformance) (the spiritual predecessor)

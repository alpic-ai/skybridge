# Skybridge Hooks Conformance

A self-testing MCP app built with [Skybridge](https://docs.skybridge.tech/home). It steps through every [Skybridge web hook](https://docs.skybridge.tech/api-reference/overview#hooks) and reports whether each one is **supported on the host it runs on** (ChatGPT / Apps SDK, Claude / MCP Apps, the DevTools emulator, ...).

## How it works

- One test per hook, run in sequence by a **stepper**. `useRequestClose` runs last: a granted close dismisses the view and ends the run, so only its failure modes leave a row in the table.
- Silent checks (reads, tool calls) run automatically. Tests with a user-visible side effect wait for you to press **Run**, and when the effect can't be verified programmatically (opening a link, downloading a file, a follow-up message, the modal), the stepper asks you to confirm whether it actually happened.
- Each test resolves to a verdict:
  - `supported`: the hook does its job on this host.
  - `partial`: part of the hook works. The detail column says which part doesn't (criteria table below).
  - `unsupported`: the host lacks the capability, either as a graceful degradation (a documented no-op, throw, or `isError`) or because the call ran without any observable effect. This is still conformant.
  - `error`: an unexpected failure (a real problem).
- The **results table** below the stepper fills in along the way. **Copy markdown** puts the whole table on your clipboard (with a manual-copy fallback for hosts that block the clipboard).

## Supported vs partial criteria

Hooks with an n/a partial column are binary: they resolve to `supported`, `unsupported`, or `error`.

| Hook | `supported` when | `partial` when |
| --- | --- | --- |
| `useToolInfo` | the tool's `structuredContent` and result `_meta` both reach the view | `structuredContent` arrives but the result `_meta` doesn't |
| `useLayout` | theme is `light`/`dark` and safe-area insets are numeric | only one of the two holds |
| `useUser` | locale parses, device type is known, capabilities are booleans | one or two of the three checks fail |
| `useViewState` | a written value reads back from the hook | n/a |
| `useCallTool` | the `conformance` tool echoes the probe label back | n/a |
| `useSetOpenInAppUrl` | the call resolves | n/a |
| `useDisplayMode` | fullscreen is granted (restore the initial mode manually) | the mode reads fine but the host grants a different mode |
| `useRequestSize` | the iframe height actually changes | n/a |
| `useRequestModal` | the modal opens and you confirm it | n/a |
| `useOpenExternal` | the link opens and you confirm it | n/a |
| `useDownload` | the host accepts the request and you confirm the file downloaded | n/a |
| `useFiles` | `upload` resolves with file metadata | n/a |
| `useSendFollowUpMessage` | `send` resolves and you confirm a message appeared | n/a |
| `useRegisterViewTool` | the host invokes the registered view tool | n/a |
| `useRequestClose` | the view actually disappears (no row is recorded, the run ends) | n/a |

## Getting Started

### Prerequisites

- Node.js 24+

### Local Development

```bash
pnpm install
pnpm dev
```

This starts the MCP server at `http://localhost:3000/mcp` and the Skybridge DevTools UI at `http://localhost:3000/`. Open DevTools and invoke the `conformance` tool.

Note: the DevTools emulator doesn't implement every host capability (`useDownload`, `useRequestSize`, and the view-tool invocation report `unsupported` there). Connect a real host (Claude, ChatGPT) for a representative run.

## Project structure

```
src/
  server.ts              # MCP server: one widget-accessible `conformance` view tool
  tests.tsx              # One test component per hook + the ordered TESTS list
  index.css              # Tailwind + @alpic-ai/ui theme
  views/conformance.tsx  # The single view: stepper + copyable results table
```

## Adding a test

1. In `src/tests.tsx`, write a component that drives the hook and calls `onResult` exactly once (the `useProbe` helper does this for you).
2. Add a `TestDef` entry to `TESTS`: mark it `auto` if it has no visible side effect, or give it a `confirm` question if only the user can verify the effect.

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [mcp-app-conformance](https://github.com/alpic-ai/mcp-app-conformance) (the spiritual predecessor)

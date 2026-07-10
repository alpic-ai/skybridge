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
  automation.ts          # postMessage remote-control protocol for external drivers
  index.css              # Tailwind + @alpic-ai/ui theme
  views/conformance.tsx  # The single view: stepper + copyable results table
notte/                   # Automated runs on real hosts (see E2E below)
```

## Adding a test

1. In `src/tests.tsx`, write a component that drives the hook and calls `onResult` exactly once (the `useProbe` helper does this for you).
2. Add a `TestDef` entry to `TESTS`: mark it `auto` if it has no visible side effect, or give it a `confirm` question if only the user can verify the effect.

## E2E

`notte/` runs the app end-to-end on a real ChatGPT host via a [Notte](https://notte.cc) cloud browser, acting as the human tester: it presses Run/Close on the action tests and answers the Yes/No confirmations by verifying the side effects from outside the widget (modal overlay, new tab, follow-up message in the conversation). A confirmation it has no way to verify falls back to Skip, which no ChatGPT test currently hits (the only unverified candidate, `useDownload`, self-reports `unsupported` there before any confirmation shows). No LLM is involved (no scrape, no agent), the run cost is Notte session time only.

| File                              | What it does                                                                    |
| --------------------------------- |---------------------------------------------------------------------------------|
| `chatgpt-conformance-function.py` | Notte function: sends `run @Conformance`, drives the stepper, extracts the rows |
| `run-conformance.ts`              | CI entrypoint: cloud-runs the function, saves artifacts, gates on the baseline  |
| `chatgpt_expected.json`           | Expected verdict per hook: the CI baseline                                      |
| `create-profile.ts`               | Creates/reopens a Notte profile so you can log into the ChatGPT account         |

The driver talks to the app over postMessage in both directions (the widget iframes are cross-origin, so it cannot click or read them): buttons are pressed through the drive hook (`{type: "conformance:drive", action: run|skip|yes|no|close-modal|restore-inline}`) and progress is read from the app's state broadcasts (`{type: "conformance:state", state}`, sent to `window.top` on every change plus a 1.5s heartbeat). Both sides live in `src/automation.ts`.

### Setup

The function expects the conformance app to be already connected in the ChatGPT account/workspace the profile is logged into:

0. **Environment**: `cp .env.example .env` and fill it in — the `notte:*` scripts load it via Node's `--env-file-if-exists` (`NOTTE_API_KEY`, plus `NOTTE_CHATGPT_FUNCTION_ID`/`NOTTE_PROFILE_ID` as defaults for the run flags). CI passes real env vars instead; flags always override.
1. **Connect the app** from any browser logged into the target ChatGPT account/workspace (connectors are account-level): enable developer mode, then connect the deployed conformance server as an app named `Conformance`.
2. **Create a Notte profile logged into that account**: log in via the live viewer this opens, then press Enter to persist:

```bash
pnpm notte:profile my-chatgpt-workspace
```

3. **Deploy the function** (`notte auth login` first): `notte functions create --file notte/chatgpt-conformance-function.py --name "ChatGPT Skybridge Conformance"` the first time, `pnpm notte:update` afterwards. Without `--function-id`, the CLI targets its machine-local "current function" (`~/.notte/cli/current_function`, set by the last `create`) — pass `pnpm notte:update --function-id <id>` if you have created other functions since. The function takes `profile_id` (required) and `app_name` (default `Conformance`) as variables.

### Running

```bash
pnpm notte:run   # ids from .env; or override: --function-id <id> --profile-id notte-profile-... --out <dir>
```

This cloud-runs the function (result and logs stay retrievable via `notte functions run-metadata`), writes `results.json` and `screenshot.png` into `--out`, and compares every hook's verdict against the `chatgpt_expected.json` baseline (override with `--expected`, empty string to skip). It exits non-zero when the run fails **or any verdict deviates from the baseline**. A regression fails CI, and an improvement does too until the baseline is updated. Mismatches are printed and recorded in `results.json`.

The scheduled GitHub Actions workflow lives at `.github/workflows/conformance.yml` (every 6 hours + manual dispatch, Slack alert on failure with the mismatches). It needs the repo secrets `NOTTE_API_KEY` and `SLACK_WEBHOOK_URL`, and the variables `NOTTE_CHATGPT_FUNCTION_ID` and `NOTTE_PROFILE_ID`.

### Caveats

- `headless=False` is required: headless Chromium drops cross-origin MessagePort transfers, which breaks the widget init handshake.
- A full run takes several minutes (fifteen tests, waits between actions, and the follow-up verification can wait up to 2 minutes for ChatGPT to commit the turn). Budget a ~12 minute timeout.
- The function itself must be Python: Notte executes it server-side in a Python AST sandbox (which also rejects some nodes, e.g. lambdas — keep it to plain functions). The client-side scripts are zero-dependency TypeScript, run directly with Node 24 (native type stripping).

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [mcp-app-conformance](https://github.com/alpic-ai/mcp-app-conformance) (the spiritual predecessor)

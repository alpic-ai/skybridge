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

`notte/conformance.py` runs the app end-to-end on a real host (ChatGPT or Claude), acting as the human tester: it presses Run/Close on the action tests and answers the Yes/No confirmations by verifying the side effects from outside the widget (modal overlay, new tab, follow-up message, host permission dialog). No LLM is involved (no scrape, no agent).

It's one plain [Playwright](https://playwright.dev) (sync) script, driven by [`uv`](https://docs.astral.sh/uv/) (inline script deps, no separate install). Two flags:

- `--host chatgpt|claude`: which host to drive.
- `--mode local|notte`: the browser backend. `local` is a persistent Chrome profile on your machine (`notte/.profiles/local`, gitignored) that you log into once by hand; `notte` connects to a [Notte](https://notte.cc) cloud browser over Chrome DevTools Protocol, which is what CI uses (no display needed, and the login persists in the Notte profile).

The driver presses the widget's real buttons (Playwright reaches across the host's cross-origin iframes) and only falls back to the postMessage drive protocol when a button isn't reachable. Real clicks matter: ChatGPT gates the follow-up and open-external effects behind a genuine user gesture, which postMessage can't supply.

| File                    | What it does                                                                   |
| ----------------------- | ----------------------------------------------------------------------------- |
| `conformance.py`        | The driver: `--host chatgpt\|claude`, `--mode local\|notte`, gates on the baseline |
| `chatgpt_expected.json` | Expected verdict per hook on ChatGPT: the CI baseline                          |
| `claude_expected.json`  | Expected verdict per hook on Claude                                            |
| `create-profile.ts`     | Creates/reopens a Notte profile so you can log into the host account           |

The driver talks to the app over postMessage (the widget iframes are cross-origin): the drive hook accepts `{type: "conformance:drive", action: run|skip|yes|no|close-modal|restore-inline}` and the app broadcasts `{type: "conformance:state", state}` to `window.top` on every change plus a 1.5s heartbeat. Both sides live in `src/automation.ts`.

### Running

```bash
uv run notte/conformance.py --host chatgpt --mode local            # local Chrome, logged-in profile
uv run notte/conformance.py --host claude  --mode local
uv run notte/conformance.py --host chatgpt --mode notte            # Notte cloud browser (profile id from .env)
pnpm notte:run --host claude --mode notte                          # same, via the npm script
```

Each run writes `results.json` and `screenshot.png` to `notte/out/<host>/` (override with `--out`) and exits non-zero when the run fails **or any gated verdict deviates from `<host>_expected.json`** (override with `--expected`, empty string to skip). A regression fails CI, and so does an improvement until you update the baseline. Mismatches are printed and recorded in `results.json`.

Host quirks the driver handles: both hosts gate `openExternal` (and Claude also `useDownload`) behind a native permission dialog ("Open link" / "Download") that the driver accepts, which both confirms the host handled the hook and dismisses the backdrop; ChatGPT also gates the follow-up effect behind a real user gesture, so the driver clicks the widget's real buttons rather than only posting messages; Claude renders `useRequestModal` inside the widget rather than as a host dialog. When a test stalls or the widget fails to boot, the driver retries the whole run in a fresh conversation.

### Setup

The app must be connected in the host account the profile is logged into:

0. **Environment**: `cp .env.example .env` and fill in `NOTTE_API_KEY` and `NOTTE_PROFILE_ID`. `conformance.py` loads `.env` itself; `pnpm notte:profile` loads it via Node. CI passes real env vars instead; flags always override.
1. **Connect the app** from any browser logged into the target account (connectors are account-level): enable developer mode, then connect the deployed conformance server as an app named `Conformance`. Both ChatGPT and Claude need the connection on their respective accounts.
2. **Create a Notte profile logged into that account** (for `--mode notte`): log in via the live viewer this opens, then press Enter to persist. For `--mode local`, just run once and log in by hand in the Chrome window that opens.

```bash
pnpm notte:profile my-workspace
```

The scheduled GitHub Actions workflow lives at `.github/workflows/conformance.yml` (every 6 hours + manual dispatch, one matrix job per host, Slack alert on failure with the mismatches). It needs the repo secrets `NOTTE_API_KEY` and `SLACK_WEBHOOK_URL`, and the variable `NOTTE_PROFILE_ID`.

### Caveats

- `headless=False` is required (local mode, and the Notte session is non-headless too): headless Chromium drops cross-origin MessagePort transfers, which breaks the widget init handshake.
- A full run takes several minutes (fifteen tests, waits between actions, the 60s `useRegisterViewTool` timeout, and the follow-up verification can wait up to 2 minutes for the host to commit the turn). Over Notte, real clicks cost ~7s each on top (CDP round-trip), so budget ~15 minutes per host.
- `useOpenExternal` is gated on both hosts now that each pops an observable "Open link" confirmation dialog the driver accepts. (It used to be un-gated over `--mode notte`, when ChatGPT opened a new tab that never surfaced to Playwright over Notte's CDP.) `UNVERIFIABLE_BY_MODE` in `conformance.py` is the seam for re-excluding any hook that becomes unobservable in a given mode; excluded hooks are recorded under `not_gated` in `results.json`.

## Resources

- [Skybridge Documentation](https://docs.skybridge.tech/)
- [mcp-app-conformance](https://github.com/alpic-ai/mcp-app-conformance) (the spiritual predecessor)

# Devtools E2E Tests — Design

## Goal

Introduce a smoke / regression-net e2e suite for `@skybridge/devtools` so the recent layout migration and future UI work can land without silently breaking the core user flow: connect to an MCP server, list its tools, call a plain tool, call a widget-backed tool.

Auth coverage is **out of scope for this round** but the suite is structured so an auth variant is additive (new fixture file + new spec + second Playwright project) rather than a rewrite.

## Scope

In scope:

- Browser-driven tests (Playwright, Chromium) running the real devtools dev server against a real `skybridge/server` instance over Streamable HTTP.
- A single minimal fixture MCP server exposing two tools: `echo` (no widget) and `echo-card` (widget-backed).
- A purpose-built test widget for `echo-card` whose DOM is trivially assertable.
- Playwright wiring (config, scripts), opt-in `test:e2e` package script, CI job.

Out of scope (explicit, deferred):

- Auth-enabled fixture, OAuth issuer, auth specs.
- Inspector preferences persistence, error states (server down, OAuth failure), multi-tool flows.
- Resources / prompts coverage.
- Visual regression / screenshot snapshots.
- CI browser matrix beyond Chromium.

## Architecture

```
packages/devtools/
  e2e/
    fixtures/
      server.ts            # standalone Node entry — boots an McpServer over Streamable HTTP
      widget/              # Vite-built widget bundle for echo-card
        vite.config.ts
        src/
          index.html
          main.tsx
          EchoCard.tsx
    tests/
      smoke.spec.ts        # connect, plain tool, widget tool
    playwright.config.ts
    tsconfig.json
```

The fixture server runs on a fixed port (4101) and serves the MCP endpoint at `/mcp` plus the built widget assets. The devtools dev server (Vite, port 5173) is started by Playwright's `webServer` block with `VITE_MCP_SERVER_URL=http://localhost:4101/mcp`. Tests open `http://localhost:5173/` in Chromium and exercise the real UI against the real protocol — no mocking at the network or transport layer.

## Fixture server

`e2e/fixtures/server.ts` is a thin wrapper around `skybridge/server` that registers exactly two tools:

```ts
const server = new McpServer({ name: "e2e-fixture", version: "0.0.0" }, { capabilities: {} })
  .registerTool(
    "echo",
    {
      description: "Echo back the input message",
      inputSchema: { message: z.string() },
    },
    async ({ message }) => ({
      structuredContent: { message },
      content: [{ type: "text", text: message }],
      isError: false,
    }),
  )
  .registerWidget(
    "echo-card",
    { description: "Echo card widget" },
    {
      description: "Echo back the input message and render it",
      inputSchema: { message: z.string() },
    },
    async ({ message }) => ({
      structuredContent: { message },
      content: [{ type: "text", text: message }],
      isError: false,
    }),
  );
```

The server boots from a single `tsx e2e/fixtures/server.ts` command — no build step on the server side. CORS is open. No persistence, no global state, deterministic.

The fixture mirrors how a real Skybridge app server is written (same `McpServer` API, same Streamable HTTP transport) so the devtools client code is exercised end-to-end without any test-only code paths.

## Widget asset for `echo-card`

The widget is a Vite-built React bundle served alongside the MCP endpoint, exactly like a real Skybridge app — `registerWidget` references it by name and the framework wires the iframe URL.

```
e2e/fixtures/widget/
  vite.config.ts          # uses skybridge's web Vite plugin (same setup as examples)
  src/
    index.html
    main.tsx              # mounts <EchoCard />
    EchoCard.tsx
```

`EchoCard.tsx` is intentionally minimal so the assertion target is unambiguous:

```tsx
import { useToolOutput } from "skybridge/web";

export function EchoCard() {
  const output = useToolOutput<{ message: string }>();
  return <p data-testid="echo-card-message">{output?.message ?? ""}</p>;
}
```

The widget is built once via `vite build` before the fixture server starts (see scripts below). The build is sub-second; we don't run skybridge's full dev pipeline.

## Tests

`e2e/tests/smoke.spec.ts` — three tests against a single Playwright project:

1. **Connects and lists tools** — load `/`, header shows the fixture server name (`e2e-fixture`), both tools appear in the sidebar.
2. **Calls a plain tool** — load `/?tool=echo`, fill the `message` field with a fresh random token, click Call, assert the response panel contains the token.
3. **Calls a widget tool** — load `/?tool=echo-card`, same flow, then assert the widget iframe DOM (`[data-testid="widget-iframe"] >> [data-testid="echo-card-message"]`) contains the token.

Selector strategy: prefer roles + labels, fall back to `data-testid` for the response panel and widget iframe. Adding 2–3 `data-testid` attributes to the existing devtools components is part of the implementation scope — these are the only production-code changes the suite requires.

Deep-linking via `?tool=...` works because the devtools already uses `nuqs` + `useSelectedToolName`. This avoids brittle "click the sidebar item" steps.

Random tokens (`crypto.randomUUID()`) per test guarantee assertions reflect this call's response, not a stale render.

No retries beyond Playwright's built-in auto-wait. No screenshot snapshots — they would churn with every UI tweak and undermine the regression-net goal.

## Playwright config

`e2e/playwright.config.ts`:

```ts
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm e2e:fixture",
      port: 4101,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm dev",
      port: 5173,
      env: { VITE_MCP_SERVER_URL: "http://localhost:4101/mcp" },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

## Package scripts

Added to `packages/devtools/package.json`:

```jsonc
{
  "e2e:fixture:build": "vite build --config e2e/fixtures/widget/vite.config.ts",
  "e2e:fixture": "pnpm e2e:fixture:build && tsx e2e/fixtures/server.ts",
  "test:e2e": "playwright test --config e2e/playwright.config.ts",
  "test:e2e:install": "playwright install --with-deps chromium"
}
```

The existing `test` script (`test:type` + `test:format`) is unchanged. E2E is opt-in via `test:e2e` — slower and requires browser binaries, so we don't gate every `pnpm test` on it.

## Dependencies

Added to `packages/devtools` `devDependencies`:

- `@playwright/test`
- `tsx`

Browser binaries are not committed; CI installs them via `test:e2e:install`.

## CI

Existing `.github/workflows/ci.yml` uses a matrix of named commands. Add one matrix entry to the `test` job:

```yaml
- name: Devtools E2E
  command: |
    pnpm --filter @skybridge/devtools test:e2e:install
    pnpm --filter @skybridge/devtools test:e2e
```

Playwright's `webServer` block boots the fixture and the devtools dev server itself; no additional CI orchestration needed. Trace artifacts on failure are uploaded by adding an `actions/upload-artifact` step gated on `if: failure()` in the same job — implementation will confirm whether to add this now or as a follow-up once the suite is green.

## Risks & open implementation details

- **Widget build pipeline.** The widget needs the skybridge web Vite plugin configured the same way examples configure it. Implementation will verify by referencing `examples/auth-auth0/web/vite.config.ts` and the create-skybridge template.
- **`data-testid` placement.** The exact components needing testids (response panel container, widget iframe wrapper) will be identified during implementation by inspecting `components/layout/tool-panel/`.
- **Port collisions in local dev.** `reuseExistingServer: true` outside CI mitigates this for repeated local runs.
- **Future auth variant.** Adding it later means: a second fixture (`server-auth.ts`) mounting `mcpAuthMetadataRouter` + a tiny in-process OAuth issuer, a second spec file, a second Playwright project. No changes to the no-auth structure.

## Out of scope — deferred

- Auth-enabled fixture + in-process OAuth issuer + auth specs.
- Inspector preferences persistence, error states, multi-tool flows.
- Visual regression / screenshot snapshots.
- CI matrix across browsers.

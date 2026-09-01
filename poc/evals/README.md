# Evals runner POC

**Proof of concept, not for merge.** It exists to de-risk the [Evals PRD](https://app.notion.com/p/Evals-3b21e5ce535b803594e6f71bf6dc914e)
and to give the API something concrete to be discussed against. Everything
lives under `poc/evals/`, plus one line in `pnpm-workspace.yaml` and one biome
override. Nothing in `packages/` is touched.

## What changed since the first spike

Following the PRD review, this version does the opposite of the first spike: it
stays out of vitest's way and augments it, the way `@vitest/browser` does.

- It is a real Vite/Vitest plugin. `evals()` goes in `vitest.config.ts` and
  contributes `setupFiles`, `globalSetup`, `provide` and `testTimeout`. There
  is no second config file.
- `it` and `expect` are vitest's own, untouched. Scenarios import two
  functions: `start<AppType>()` opens a fresh MCP session and returns the
  conversation (the browser plugin's `render()` shape), and `repeat` runs a
  scenario several times against a pass threshold. The type parameter on
  `start` is what pins the matchers to the project's registry, one mention per
  test.
- Teardown is automatic: every chat opened during a test is closed by an
  `afterEach` the plugin's setup file registers, the way testing-library's
  auto cleanup works. Scenarios never write lifecycle code. The registry
  assumes tests in a file run sequentially, vitest's default; `it.concurrent`
  would need it keyed per test.
- `repeat({ runs, threshold }, fn)` takes per-scenario overrides; defaults come
  from the plugin config, so CI can raise `runs` without touching a test.
- `expect.chat(chat)` returns a narrowed assertion carrying only the tool-call
  matchers. It deliberately does not extend vitest's global `Matchers`, so the
  helpers never surface on unrelated `expect()` calls, and it is the one place
  later tool-call helpers get added.
- The model is either a descriptor the runner constructs
  (`{ provider, name }`) or, for a provider we cannot build such as a company
  gateway, a file that calls `defineEvalModel`. A live provider instance cannot
  be a plugin option, because vitest serializes config to the workers, so it
  has to be constructed worker-side either way. The API key is named by env var
  and never appears in config.

## Running it

```bash
cp .env.example .env   # then set ANTHROPIC_API_KEY
pnpm eval
```

`pnpm test` only typechecks, so CI never spends money here.

**Temperature 0 is not deterministic, and one scenario proves it.** "carries
the category forward when a later turn omits it" passed on four consecutive
runs and then failed, with the second turn re-searching as
`{"keyword":"goggles"}`: it dropped both the category it had just used and the
`sort` the user asked for. Nothing in the harness changed between those runs.
So the PRD's load-bearing assumption, that a single run at temperature 0 is
stable enough for green to mean green, does not hold even on a five-scenario
suite. That scenario is left asserting the behaviour we want rather than the
behaviour we get, now under `repeat({ runs: 3, threshold: 0.66 })`, and it is
red more often than not (a later session measured 1 of 3). The failure output
shows each run's outcome individually. It is a real signal that
`search-products` does not lead the model to carry refinement context or to
use `sort`, which is exactly the class of problem evals exist to surface.

## Deliberately out of this POC

Suite-level repetition (run everything N times, aggregate in a reporter). It
would also produce the stored artifact the run-over-run comparison needs, so
the two should be designed together rather than guessed at now. The
per-scenario `repeat` here is the complementary tool for scenarios known to be
non-deterministic, not a replacement for it.

## Findings

**Typed assertions need to live in the matcher.** Vitest types `toEqual` as
`<E>(expected: E) => void`, so asserting on the raw `toolCalls` array pins
nothing: a wrong tool name, a misspelled argument and a wrong value type all
typecheck. Moving the assertion into `expect.chat(...).toHaveCalledToolOnce()`
pins both the tool name and the argument shape to the project's registry.
`src/typing-probe.ts` is the evidence, and it is covered by `pnpm test`.

**Subset matching has to be the default.** `intentMiddleware()` injects a
`user_intent` argument into every tool schema, so equality against the whole
arguments object can never hold. Every matcher compares a subset.

**`ToolInput` is the parsed input**, so a zod `.default()` reads as required
even though the model never sends it. Expected arguments are `Partial<>` for
that reason.

**The server still cannot report its own port.** `server.run()` does not return
what it bound, so the runner picks a free port and passes it in as `__PORT`,
which leaves a bind race. Fixing that belongs in `packages/core`, not here.

## Where the typing question landed

Earlier iterations threaded the app type through a `createEvalTest<AppType>()`
factory returning an extended `it`. Review feedback (rightly) called out that
the API contract should not change to satisfy a typing need, and that an
explicit `start` reads more naturally than fixture plumbing for deciding when
a conversation begins. `start<AppType>()` settles it: `it` stays vitest's, and
the one generic per test is what keeps a wrong tool name or argument failing
to typecheck before it costs a model call. Options rejected along the way,
with reasons: module augmentation (silently degrades to accepting any tool
name if the declaration file is not picked up, and allows one app per
project), custom keys on `it`'s second argument (vitest discards unknown keys,
verified), and a global `chat` (leaks conversation state between scenarios,
which the PRD forbids).

## Known rough edges

Kept deliberately, listed so review does not have to find them:

- The server command is hardcoded in the plugin options rather than derived
  from the project. How the runner should learn it is still open in the PRD.
- The eval file imports `AppType` from `examples/ecom-carousel` by relative
  path and spawns that package's `tsx`, neither declared as a dependency.
- `search-products` reaches the real catalog, so these scenarios depend on data
  the runner does not control. That is the stubbing the PRD defers.
- `DEFAULT_MAX_STEPS` is a runaway guard, not the spend ceiling the PRD defers.
- `systemPrompt`, `maxSteps` and the `server` option (evaluate a server you
  started yourself) are wired through but no scenario sets them. The
  descriptor covers Anthropic only; another provider is a case in
  `resolveModel`, or the `defineEvalModel` file, which is verified working.
- No run-over-run comparison. The PRD asks for it, but it needs a stored
  baseline artifact, which is the same artifact the devtools test tab would
  read, so both should be designed together rather than guessed at here.
- `repeat` classifies errors to rethrow infrastructure failures instead of
  counting them as failed runs. Custom-matcher failures are `JestExtendError`
  with `name: "Error"` and no `matcherResult`, only `actual`/`expected`, so
  matcher-aware code cannot rely on the error name.
- Every matcher subset-matches, so asserting one argument out of five reads the
  same as asserting all five. The PRD wanted looseness opted into visibly, but
  `intentMiddleware` injects `user_intent` into every schema, so strict
  equality can never hold. Worth resolving before the API is fixed.

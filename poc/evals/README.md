# Evals POC

Throwaway spike for the Evals PRD. Not meant to be merged. It answers the two "todos before
build" spikes and runs the PRD's proposed API end to end against a real server and a real model.

```bash
cp .env.example .env   # then put an ANTHROPIC_API_KEY in it
pnpm eval
pnpm typecheck
```

`pnpm eval` starts `examples/flight-booking` on an ephemeral port, runs four scenarios against
it, and shuts it down. Three pass. The fourth is red by design, see the clock finding below.

## What it does

`skybridge.eval.config.ts` names the model (an OpenAI-compatible base URL, so Anthropic and a
local model are the same config) and the project to evaluate. `src/global-setup.ts` starts the
server once for the run. Each scenario opens its own MCP session. `src/chat.ts` is the whole
agent: `tools/list` becomes the model's tool list, the model runs at temperature 0, and every
call it makes is recorded and forwarded to the server as a real `tools/call`. Assertions are
plain vitest against `chat.toolCalls`.

## Findings

**Spike 1, starting the server from library code: works, but not from inside the process.**
`server.run()` reads `process.env.__PORT` and never returns the port it bound, so the runner
cannot ask the server where it landed. The POC works around it by picking a free port itself
(bind `:0`, read it, close) and passing it in as `__PORT`. That leaves a race: another process
can take the port between the probe closing and the server binding. `run()` should return the
bound address, at which point `__PORT=0` becomes usable and the race disappears.

Readiness is a real signal, not a sleep: the harness polls `POST /mcp` with an `initialize`
request until it answers, about 1.5s here. Spawning is `tsx src/server.ts` with
`NODE_ENV=production`, which skips the devtools and Vite middleware. How the runner should learn
that command is still the PRD's open question; here it is spelled out in config.

Teardown works over SIGTERM, which the server already handles. Worth noting that `run()`
installs its own SIGINT/SIGTERM handlers and calls `process.exit`, fine for a child process and
something to unpick if the server ever runs inside the vitest worker.

**Spike 2, deriving tool names and arguments as types: already there, and it crosses package
boundaries.** `InferTools`/`ToolNames`/`ToolInput` in `packages/core/src/server/inferUtilityTypes.ts`
work off the `AppType` an example already exports.

**But the PRD's typed-assertion claim does not hold as written.** Vitest types `toEqual` as
`<E>(expected: E) => void`, so the expected value is never checked against what it is compared
to. `expect(chat.toolCalls).toEqual([{ name: 'flight-bookings', ... }])` typechecks happily with
a tool that does not exist, and so does a misspelled argument or a wrong value type. The typing
only bites if the expectation passes through something that pins it, which is what
`expectedCalls<App>()` in `src/chat.ts` does. Every scenario here goes through it, and
`src/typing-probe.ts` shows the three cases that a bare `toEqual` lets through and
`expectedCalls` rejects. That file is deliberately outside the eval glob, so it typechecks
(under `pnpm test`) but never runs. Cost: one wrapper at every call site, which weakens the
"nothing in the assertions is ours" line a little.

**Middleware rewrites the tool surface, and the registry types do not know.** The example uses
`intentMiddleware()` from `@alpic-ai/insights`, which injects a `user_intent` argument into every
tool schema. The model sends `{ origin: 'LHR', ..., user_intent: 'Looking for round-trip
flights...' }` while `ToolInput` says only the declared fields exist. Exact equality on the whole
arguments object therefore cannot be the default on any project using that middleware.
`expectedCalls` handles it by relaxing each arguments object to `objectContaining` while keeping
the type pinned, so the eval file still reads as an exact expectation. Worth seeing the injected
schema in the failure output below: its description is roughly forty lines and dwarfs the tool's
own arguments, which is its own question for the tool surface.

**`ToolInput` is the parsed input, not the wire input.** `directOnly` is declared
`z.boolean().optional().default(false)`, so it is optional on the wire and required in
`ToolInput`. An expectation typed on `ToolInput` therefore demands an argument the model never
has to send. The POC works around it with `Partial`, which also loses the required/optional
distinction. The real fix is deriving expectations from the input side of the schema.

**Relative dates are irreproducible, and nothing in the eval file can fix it.** The red scenario
asks for "next Friday". The model has no current date, so it does not resolve one and calls
nothing at all, and any expected date hardcoded in the eval would rot the following week anyway.
This is the PRD's deferred frozen-clock candidate showing up on the first realistic prompt, and
it needs both a fixed clock and that date reaching the model.

**Vague refinements do not re-search, and that is a tool-surface finding.** "Only direct ones,
and nothing over 900 euros" after a first search produces no second call: the model answers in
prose over the results it already has. Rephrasing to "search again, direct flights only..." makes
it call the tool. The scenario here uses the explicit phrasing so the suite is green; changing
that one line reproduces the failure. This is exactly the class of thing evals are meant to
catch, and the fix belongs in the tool description, not in the eval.

**Determinism is unmeasured.** A handful of back-to-back runs gave identical results, but the
PRD's 20x count is not something a POC should spend on. It stays a todo, and it is the
load-bearing assumption of the must-pass criterion.

**Failure output.** `defineEval` catches the assertion error and appends the name, description
and argument schema of every tool the model was looking at, on top of vitest's expected-versus-
received diff. Server output is dumped once at the end of the run, not per scenario: that needs
the correlation id the PRD describes, and a real reporter rather than a `catch`.

## Not built

Run-to-run comparison, the JSON artifact for coding agents, the reporter, config discovery,
handler stubbing, spend ceiling. All deferred in the PRD.

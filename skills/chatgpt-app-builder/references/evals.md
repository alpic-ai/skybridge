# Evals

Assert on what a real model does with the app's tools → `@skybridge/test`

DevTools proves a tool works when called. An eval proves the model *calls* it, with the right arguments, from a natural prompt. Use one when a tool's `name`/`description`/schema changes, when two tools could be confused, or when the user asks how the app behaves in a real conversation. Evals are live model calls: they cost money and need an API key, so they are not unit tests. Keep them few and behavior-focused.

## Setup

1. Dev dependencies: `@skybridge/test`, `vitest@^4` (vitest 5 is not supported yet), `ai`, and an AI SDK provider (`@ai-sdk/anthropic`, `@ai-sdk/openai`, ...).
2. `vite.config.ts`: `skybridge({ evals: {} })`. This registers the `expect.chat` matchers, picks up `evals/**/*.eval.ts`, raises the per-scenario timeout to two minutes, and loads `.env`.
3. `package.json`: `"evals": "vitest run evals"`.
4. The model provider key in `.env` (`ANTHROPIC_API_KEY` for `@ai-sdk/anthropic`) and any credentials the definition's `setup` needs. The HTTP host's OAuth provider is not resolved during evals.

The default `demo` template from `create skybridge` already has all of this, plus `evals/start.eval.ts` to copy from; the `blank` template has none of it.

## Scenario

```typescript
// evals/search-flights.eval.ts
import { anthropic } from "@ai-sdk/anthropic";
import { start } from "@skybridge/test";
import { expect, it } from "vitest";
import { service } from "../src/server.js";

it("searches flights from a natural prompt", async () => {
  const chat = await start({ server: service, model: anthropic("claude-sonnet-4-5") });
  await chat.send("I need to fly to Lisbon next weekend");

  expect.chat(chat).toHaveCalledToolOnce("search-flights", { destination: "Lisbon" });
  expect.chat(chat).toNeverHaveCalledTool("book-flight");
});
```

Export `service = defineServer({ setup, dispose, handler })` in `src/server.ts` and host it with `new Skybridge({ server: service, oauth })`. `start({ server: service, model })` owns an independent execution: setup once, fresh SDK instances per stateless request, cleanup on `chat.close()`, test teardown, or startup failure. Keep mutable state in `setup`. `start({ app, model })` remains a shorthand using `app.server`. Keep `run()` in `src/index.ts`.

`service.mcpMiddleware(filter, handler)` returns an immutable derived definition. Newly composed wrappers run before the existing pipeline on requests and after it on responses. Evals use outer native middleware for file adaptation: application list middleware sees original schemas, and application call middleware sees resolved `FileRef` arguments before `next()`. `chat.toolCalls` records those arguments while model history keeps paths. Evals exercise MCP behavior and middleware, not HTTP token verification or Express routes.

## Matchers

All typed against the app's registry (`name` autocompletes, `args` is checked against the tool's `inputSchema`); all support `.not`.

| Matcher | Passes when |
|---|---|
| `toHaveCalledToolOnce(name, args?)` | exactly one *successful* call, optionally matching `args` (partial, `objectContaining`) |
| `toHaveCalledToolWith(name, args)` | some successful call matched `args` |
| `toNeverHaveCalledTool(name)` | no call was attempted |
| `toHaveFailedToolCall(name)` | a call was refused (auth) or threw |
| `toHaveSaid(text \| RegExp)` | an assistant turn contains it (string match is case- and whitespace-insensitive) |
| `toHaveCalledToolsInOrder(...names)` | the named tools *succeeded* in that relative order (subsequence, gaps allowed) |
| `toHaveCalledNoTools()` | no tool was attempted at all |
| `await toPassJudgment(criteria, options?)` | a judge model grades the conversation against `criteria` written in plain English |

On failure the message lists every call the model made, with arguments. Matchers see the whole conversation, not just the last `send`. `chat.toolCalls` and `chat.assistantTurns` are available for custom assertions.

## Judgments

`toPassJudgment` is the only async matcher: `await expect.chat(chat).toPassJudgment("stays inside the app's scope and explains the tool result")`. The judge reads every turn and tool call with its result, runs on the chat's own model at its default temperature, and its reasoning lands in the failure message. `options` takes `model` (another judge) or `judge`, a callback receiving `{ criteria, transcript }` and returning `{ pass, reasoning? }`, which lets an evaluation model or a scoring service grade instead of a language model. A judge that throws, the provider or your own callback, raises `judge unavailable: <error>` instead of reporting a fail. Use it only for criteria no other matcher can express. The default judge is a live model call, so it costs money and is not reproducible; a custom `judge` costs and varies only as much as whatever it calls, and a local heuristic is free and deterministic.

## Stubs

`stubs` answers a tool from the scenario instead of the app, for results that move over time (relative dates, a live catalogue):

```typescript
const chat = await start({
  server: service,
  model: anthropic("claude-sonnet-4-5"),
  stubs: { "search-flights": ({ to }) => (to === "LIS" ? lisbonFixture : undefined) },
});
```

Arguments are typed against the registry. Stubs replace only terminal implementations: normal validation, application middleware, and declared per-tool authorization run first. Returning `undefined` falls through to the original implementation; any other result skips it. Stubbed calls still appear in `chat.toolCalls`.

## Authenticated apps

Declare `auth` or `securitySchemes` on the definition and claim an identity per session. Per-tool authorization and scopes run for real, including stubbed calls:

```typescript
const chat = await start({
  server: service,
  model: anthropic("claude-sonnet-4-5"),
  authInfo: { token: "eval", clientId: "evals", scopes: ["orders:read"], extra: { subject: "user-1" } },
});
```

Omit `authInfo` to test the anonymous path: a gated tool then shows up as `toHaveFailedToolCall`.

## Defaults

`evals: { temperature, systemPrompt, maxSteps, timeout }` in the Vite plugin sets what every scenario starts from (`maxSteps` 8, timeout 120s; `temperature` is only sent when set). `temperature`, `systemPrompt` and `maxSteps` can be overridden per `start`.

## Pitfalls

- Assert on tool calls and arguments, not on exact wording; use `toHaveSaid` with a loose pattern when the answer matters.
- A failing eval usually means the tool `description` or schema `.describe()` text is unclear to the model, not that the handler is wrong. Fix the prompt surface first.
- Do not run evals in a loop while iterating on UI; run them once a tool's contract changes.

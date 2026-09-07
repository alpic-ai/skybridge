# Evals

Assert on what a real model does with the app's tools → `@skybridge/test`

DevTools proves a tool works when called. An eval proves the model *calls* it, with the right arguments, from a natural prompt. Use one when a tool's `name`/`description`/schema changes, when two tools could be confused, or when the user asks how the app behaves in a real conversation. Evals are live model calls: they cost money and need an API key, so they are not unit tests. Keep them few and behavior-focused.

## Setup

1. Dev dependencies: `@skybridge/test@beta` (published on the `beta` dist-tag only), `vitest`, `ai`, and an AI SDK provider (`@ai-sdk/anthropic`, `@ai-sdk/openai`, ...).
2. `vite.config.ts`: `skybridge({ evals: {} })`. This registers the `expect.chat` matchers, picks up `evals/**/*.eval.ts`, raises the per-scenario timeout to two minutes, and loads `.env`.
3. `package.json`: `"evals": "vitest run evals"`.
4. The provider key in `.env` (`ANTHROPIC_API_KEY` for `@ai-sdk/anthropic`). If the app has `oauth`, its provider env is needed too: `setup` and `oauth` resolve on the first request.

The default `demo` template from `create skybridge` already has all of this, plus `evals/start.eval.ts` to copy from; the `blank` template has none of it.

## Scenario

```typescript
// evals/search-flights.eval.ts
import { anthropic } from "@ai-sdk/anthropic";
import { start } from "@skybridge/test";
import { expect, it } from "vitest";
import { app } from "../src/server.js";

it("searches flights from a natural prompt", async () => {
  const chat = await start({ app, model: anthropic("claude-sonnet-4-5") });
  await chat.send("I need to fly to Lisbon next weekend");

  expect.chat(chat).toHaveCalledToolOnce("search-flights", { destination: "Lisbon" });
  expect.chat(chat).toNeverHaveCalledTool("book-flight");
});
```

`start` serves the app in process: no port, no HTTP server. This only works because `src/server.ts` exports the app and `src/index.ts` runs it; never put `run()` in `server.ts`. Each `send` is one user turn, during which the model may call several tools. The session closes with the test.

## Matchers

All typed against the app's registry (`name` autocompletes, `args` is checked against the tool's `inputSchema`); all support `.not`.

| Matcher | Passes when |
|---|---|
| `toHaveCalledToolOnce(name, args?)` | exactly one *successful* call, optionally matching `args` (partial, `objectContaining`) |
| `toHaveCalledToolWith(name, args)` | some successful call matched `args` |
| `toNeverHaveCalledTool(name)` | no call was attempted |
| `toHaveFailedToolCall(name)` | a call was refused (auth) or threw |
| `toHaveSaid(text \| RegExp)` | an assistant turn contains it (string match is case- and whitespace-insensitive) |

On failure the message lists every call the model made, with arguments. `chat.toolCalls` and `chat.assistantTurns` are available for custom assertions.

## Authenticated apps

Claim an identity per session; only token verification is skipped, per-tool `auth` and scope checks run for real:

```typescript
const chat = await start({
  app,
  model: anthropic("claude-sonnet-4-5"),
  authInfo: { token: "eval", clientId: "evals", scopes: ["orders:read"], extra: { subject: "user-1" } },
});
```

Omit `authInfo` to test the anonymous path: a gated tool then shows up as `toHaveFailedToolCall`.

## Defaults

`evals: { temperature, systemPrompt, maxSteps, timeout }` in the Vite plugin sets what every scenario starts from (temperature `0`, `maxSteps` 8, timeout 120s). `temperature`, `systemPrompt` and `maxSteps` can be overridden per `start`.

## Pitfalls

- Assert on tool calls and arguments, not on exact wording; use `toHaveSaid` with a loose pattern when the answer matters.
- A failing eval usually means the tool `description` or schema `.describe()` text is unclear to the model, not that the handler is wrong. Fix the prompt surface first.
- Do not run evals in a loop while iterating on UI; run them once a tool's contract changes.

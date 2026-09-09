# Evals

A tiny ski shop app that exists for its test suite. It is the reference for
[`@skybridge/test`](../../packages/test): every `expect.chat` matcher and every
`start()` option is exercised by a scenario in `evals/`.

The server has four tools, chosen so each matcher has one natural scenario:
`search-products` and `product-details` for a two-step flow, `create-checkout`
which needs an identity, and `clear-cart` which the model should never reach for
on its own. There are no views, because evals never render one.

## Run

Evals call a real model, so you need a key:

```bash
cp .env.example .env   # then fill in ANTHROPIC_API_KEY
pnpm evals             # run the scenarios
pnpm evals:types       # typecheck them
```

They cost tokens and their result depends on the model, so you run them when
you change a tool's name, description or input schema.

## What each scenario covers

| Scenario | Covers |
| --- | --- |
| `search.eval.ts`, natural prompt | `toHaveCalledToolOnce`, `toNeverHaveCalledTool` |
| `search.eval.ts`, price constraint | `toHaveCalledToolWith` |
| `search.eval.ts`, stock question | `toHaveSaid`, reading `chat.assistantTurns` |
| `browse.eval.ts`, search then open | `toHaveCalledToolsInOrder` |
| `browse.eval.ts`, two turns | multi-turn `send`, ordering across turns |
| `browse.eval.ts`, greeting | `toHaveCalledNoTools`, `systemPrompt` and `maxSteps` overrides |
| `checkout.eval.ts`, anonymous | `toHaveFailedToolCall` |
| `checkout.eval.ts`, signed in | `authInfo`, `.not`, reading `chat.toolCalls` |

The plugin config in `vite.config.ts` sets shared defaults for every scenario,
so it also covers the `evals` options on the Vite plugin.

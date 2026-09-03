import { anthropic } from "@ai-sdk/anthropic";
import { start } from "@skybridge/test";
import { expect, it } from "vitest";
import { app } from "../src/server.js";

it("reaches the coffee search tool from a natural prompt", async () => {
  const chat = await start({
    app,
    model: anthropic("claude-sonnet-4-5"),
    authInfo: {
      token: "eval-token",
      clientId: "eval-client",
      scopes: [],
      extra: { email: "ada@example.com", subject: "user-ada" },
    },
  });
  await chat.send("Find me a great espresso place in Paris, rated 4 or more");

  expect.chat(chat).toHaveCalledToolOnce("search-coffee-paris");
});

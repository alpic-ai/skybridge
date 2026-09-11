import { anthropic } from "@ai-sdk/anthropic";
import { type EvalIdentity, start } from "@skybridge/test";
import { expect, it } from "vitest";
import { app } from "../src/server.js";

const model = anthropic("claude-sonnet-4-5");

const signedIn: EvalIdentity = {
  token: "eval-token",
  clientId: "eval-client",
  scopes: [],
  extra: { email: "ada@example.com" },
};

it("refuses checkout for an anonymous visitor", async () => {
  const chat = await start({ app, model });
  await chat.send("Buy the product goggles-aurora for me");

  expect.chat(chat).toHaveFailedToolCall("create-checkout");
});

it("checks out for a signed-in visitor", async () => {
  const chat = await start({ app, model, authInfo: signedIn });
  await chat.send("Buy the product goggles-aurora for me");

  expect.chat(chat).toHaveCalledToolWith("create-checkout", {
    id: "goggles-aurora",
  });
  expect.chat(chat).not.toHaveFailedToolCall("create-checkout");
  expect(chat.toolCalls[chat.toolCalls.length - 1]?.name).toBe(
    "create-checkout",
  );
});

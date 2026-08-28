import { anthropic } from "@ai-sdk/anthropic";
import { start } from "@skybridge/test";
import { expect, it } from "vitest";
import { app } from "../src/server.js";

it("reaches the onboarding tool from a natural prompt", async () => {
  const chat = await start({ app, model: anthropic("claude-sonnet-4-5") });
  await chat.send("Get me started with Skybridge, my name is Ada");

  expect.chat(chat).toHaveCalledToolOnce("start");
});

import { anthropic } from "@ai-sdk/anthropic";
import { start } from "@skybridge/test";
import { expect, it } from "vitest";
import { app } from "../src/server.js";

it("reaches the capitals tool from a natural prompt", async () => {
  const chat = await start({ app, model: anthropic("claude-sonnet-4-5") });
  await chat.send("Tell me about the capital of France");

  expect.chat(chat).toHaveCalledToolWith("explore-capitals", { name: "Paris" });
});

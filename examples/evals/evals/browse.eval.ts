import { anthropic } from "@ai-sdk/anthropic";
import { start } from "@skybridge/test";
import { expect, it } from "vitest";
import { app } from "../src/server.js";

const model = anthropic("claude-sonnet-4-5");

it("searches the catalog before opening one product", async () => {
  const chat = await start({ app, model });
  await chat.send("Find the goggles you sell and tell me about the cheapest");

  expect
    .chat(chat)
    .toHaveCalledToolsInOrder("search-products", "product-details");
});

it("carries the conversation across two turns", async () => {
  const chat = await start({ app, model });
  await chat.send("What goggles do you sell?");
  await chat.send("Tell me more about the Aurora ones");

  expect
    .chat(chat)
    .toHaveCalledToolsInOrder("search-products", "product-details");
  expect
    .chat(chat)
    .toHaveCalledToolWith("product-details", { id: "goggles-aurora" });
});

it("calls nothing when there is nothing to look up", async () => {
  const chat = await start({
    app,
    model,
    systemPrompt:
      "You are a ski shop assistant. Only call a tool when the user asks about the catalog, a product or an order.",
    maxSteps: 2,
  });
  await chat.send("Hi there!");

  expect.chat(chat).toHaveCalledNoTools();
});

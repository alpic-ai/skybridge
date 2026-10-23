import { anthropic } from "@ai-sdk/anthropic";
import { start } from "@skybridge/test";
import { expect, it } from "vitest";
import { app } from "../src/server.js";

const model = anthropic("claude-sonnet-4-5");

// Both conversations share the app; stubs apply only to the chat that declares them.

it("answers from a stubbed catalog, and falls through for the rest", async () => {
  const chat = await start({
    app,
    model,
    stubs: {
      "search-products": ({ category }) =>
        category === "goggles"
          ? {
              products: [
                {
                  id: "goggles-eclipse",
                  name: "Eclipse Goggles",
                  price: 90,
                  inStock: true,
                },
              ],
            }
          : undefined,
    },
  });
  await chat.send("What ski goggles do you have?");
  await chat.send("And what gloves do you sell?");

  expect
    .chat(chat)
    .toHaveCalledToolWith("search-products", { category: "goggles" });
  expect
    .chat(chat)
    .toHaveCalledToolWith("search-products", { category: "gloves" });
  expect.chat(chat).toHaveSaid(/eclipse/i);
  expect.chat(chat).toHaveSaid(/tundra/i);
});

it("uses the real catalog in a separate conversation without stubs", async () => {
  const chat = await start({ app, model });
  await chat.send("What ski goggles do you have?");

  expect
    .chat(chat)
    .toHaveCalledToolWith("search-products", { category: "goggles" });
  expect.chat(chat).toHaveSaid(/aurora/i);
  expect.chat(chat).not.toHaveSaid(/eclipse/i);
});

import { anthropic } from "@ai-sdk/anthropic";
import { start } from "@skybridge/test";
import { expect, it } from "vitest";
import { app } from "../src/server.js";

const model = anthropic("claude-sonnet-4-5");

it("reaches the catalog from a natural prompt", async () => {
  const chat = await start({ app, model });
  await chat.send("What ski goggles do you have?");

  expect.chat(chat).toHaveCalledToolOnce("search-products");
  expect.chat(chat).toNeverHaveCalledTool("clear-cart");
});

it("passes a price constraint through to the tool", async () => {
  const chat = await start({ app, model });
  await chat.send("Show me the goggles you sell for 100 euros or less");

  expect.chat(chat).toHaveCalledToolWith("search-products", {
    category: "goggles",
    maxPrice: 100,
  });
});

it("answers from what the tool returned", async () => {
  const chat = await start({ app, model });
  await chat.send("Do you have the Summit Pro goggles in stock?");

  expect.chat(chat).toHaveSaid(/out of stock/i);
  expect(chat.assistantTurns.length).toBeGreaterThan(0);
});

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

  expect.chat(chat).toHaveSaid(/eclipse/i);
  expect.chat(chat).toHaveSaid(/tundra/i);
});

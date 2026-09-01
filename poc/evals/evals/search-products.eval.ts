import { expect, it } from "vitest";
import type { AppType } from "../../../examples/ecom-carousel/src/server.js";
import { repeat } from "../src/repeat.js";
import { start } from "../src/session-registry.js";

it("scopes an explicit category onto the category argument", async () => {
  const chat = await start<AppType>();
  await chat.send("I'm looking for ski goggles");

  expect.chat(chat).toHaveCalledToolWith("search-products", {
    category: "goggles",
  });
});

it("carries a change of category through a refinement", async () => {
  const chat = await start<AppType>();
  await chat.send("Show me your skis");
  await chat.send("Actually, show me apparel instead");

  expect.chat(chat).toHaveCalledToolWith("search-products", {
    category: "apparel",
  });
});

it("does not render a carousel for a product it does not stock", async () => {
  const chat = await start<AppType>();
  await chat.send("Do you sell snowboards?");

  expect.chat(chat).toNeverHaveCalledTool("render-carousel");
});

it("maps an indirect need onto a category", async () => {
  const chat = await start<AppType>();
  await chat.send("I need something to keep my head warm on the slopes");

  expect.chat(chat).toHaveCalledToolWith("search-products", {
    category: "apparel",
  });
});

it("carries the category forward when a later turn omits it", async () => {
  await repeat({ runs: 3, threshold: 0.66 }, async () => {
    const chat = await start<AppType>();
    await chat.send("Show me your goggles");
    await chat.send("Sort those by price, cheapest first");

    expect.chat(chat).toHaveCalledToolWith("search-products", {
      category: "goggles",
      sort: "price-asc",
    });
  });
});

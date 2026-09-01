import { expect } from "vitest";
import type { AppType } from "../../../examples/ecom-carousel/src/server.js";
import type { Chat } from "./chat.js";

declare const chat: Chat<AppType>;

/**
 * Finding: vitest types `toEqual` as `<E>(expected: E) => void`, so asserting
 * on the raw array pins nothing. None of these is a type error.
 */
expect(chat.toolCalls).toEqual([
  { name: "search-product", arguments: { keyword: "goggles" } },
]);
expect(chat.toolCalls).toEqual([
  { name: "search-products", arguments: { category: "snowboards" } },
]);
expect(chat.toolCalls).toEqual([
  { name: "search-products", arguments: { colour: "black" } },
]);

/**
 * The same three fail to typecheck through `expect.chat`, because the matcher
 * pins the tool name and the argument shape to the project's registry.
 */
// @ts-expect-error unknown tool name
expect.chat(chat).toHaveCalledToolOnce("search-product");
expect.chat(chat).toHaveCalledToolWith("search-products", {
  // @ts-expect-error category is an enum of apparel | goggles | skis
  category: "snowboards",
});
// @ts-expect-error the tool has no colour argument
expect.chat(chat).toHaveCalledToolWith("search-products", { colour: "black" });

expect.chat(chat).toHaveCalledToolWith("search-products", {
  keyword: "goggles",
  category: "goggles",
});
expect.chat(chat).toNeverHaveCalledTool("render-carousel");

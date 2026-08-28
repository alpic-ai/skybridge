import { describe, expect, it } from "vitest";
import type { ChatLike } from "./types.js";
import "./matchers.js";

function fakeChat(
  toolCalls: Array<{
    name: string;
    arguments: Record<string, unknown>;
    failed?: string;
  }>,
): ChatLike<unknown> {
  return {
    toolCalls,
  } as unknown as ChatLike<unknown>;
}

describe("expect.chat", () => {
  it("subset-matches arguments, so injected extras do not break a match", () => {
    const chat = fakeChat([
      {
        name: "search-products",
        arguments: { category: "goggles", user_intent: "injected" },
      },
    ]);

    expect.chat(chat).toHaveCalledToolWith("search-products", {
      category: "goggles",
    } as never);
  });

  it("reports the calls made and marks failed ones", () => {
    const chat = fakeChat([
      {
        name: "render-carousel",
        arguments: { ids: [] },
        failed: "the tool returned an error: []",
      },
    ]);

    expect(() =>
      expect.chat(chat).toHaveCalledToolOnce("search-products" as never),
    ).toThrow(
      /a call that succeeded, but 0 such calls[\s\S]*render-carousel[\s\S]*failed: the tool returned an error/,
    );
  });

  it("a failed call does not satisfy a positive matcher", () => {
    const chat = fakeChat([
      {
        name: "search-products",
        arguments: { category: "goggles", maxPrice: "cheap" },
        failed: "the tool returned an error: []",
      },
    ]);

    expect(() =>
      expect.chat(chat).toHaveCalledToolWith("search-products", {
        category: "goggles",
      } as never),
    ).toThrow(/to be called with[\s\S]*failed: the tool returned an error/);
    expect(() =>
      expect.chat(chat).toHaveCalledToolOnce("search-products" as never),
    ).toThrow(/a call that succeeded/);
  });

  it("a failed call still counts as an attempt for the negative matcher", () => {
    const chat = fakeChat([
      {
        name: "create-checkout",
        arguments: {},
        failed: "the tool returned an error: []",
      },
    ]);

    expect(() =>
      expect.chat(chat).toNeverHaveCalledTool("create-checkout" as never),
    ).toThrow(/never to be called/);
  });

  it("toNeverHaveCalledTool fails when the tool fired", () => {
    const chat = fakeChat([{ name: "create-checkout", arguments: {} }]);

    expect(() =>
      expect.chat(chat).toNeverHaveCalledTool("create-checkout" as never),
    ).toThrow(/never to be called, but it was called 1 times/);
  });
});

describe("toHaveFailedToolCall", () => {
  it("passes when the server rejected the call and fails when it succeeded", () => {
    const failing = fakeChat([
      {
        name: "search-products",
        arguments: {},
        failed: "the tool returned an error: boom",
      },
    ]);
    const succeeding = fakeChat([{ name: "search-products", arguments: {} }]);

    expect.chat(failing).toHaveFailedToolCall("search-products" as never);
    expect
      .chat(succeeding)
      .not.toHaveFailedToolCall("search-products" as never);
  });
});

describe("toHaveSaid", () => {
  const chat = {
    toolCalls: [],
    assistantTurns: [
      "I found 3 pairs of\nski goggles",
      "They're all in stock.",
    ],
  } as unknown as ChatLike<unknown>;

  it("matches a string case-insensitively across wrapped whitespace", () => {
    expect.chat(chat).toHaveSaid("SKI GOGGLES");
  });

  it("matches any turn, not just the last", () => {
    expect.chat(chat).toHaveSaid(/\d+ pairs?/);
  });

  it("does not match a phrase spanning two turns", () => {
    expect.chat(chat).not.toHaveSaid("goggles in stock");
  });
});

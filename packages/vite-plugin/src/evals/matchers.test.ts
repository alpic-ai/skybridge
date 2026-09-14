import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";
import type { ChatLike } from "./types.js";
import "./matchers.js";

function judgeChat(
  verdict: { pass: boolean; reasoning: string } | Error,
): ChatLike<unknown> {
  return {
    toolCalls: [],
    transcript: [
      { role: "user", text: "Plan a weekend in Lisbon under 500 euros" },
      { role: "assistant", text: "Here is a 640 euro plan." },
    ],
    assistantTurns: ["Here is a 640 euro plan."],
    model: new MockLanguageModelV3({
      doGenerate: async () => {
        if (verdict instanceof Error) {
          throw verdict;
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(verdict) }],
          finishReason: { unified: "stop" as const, raw: undefined },
          usage: {
            inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 1, text: 1, reasoning: 0 },
            totalTokens: 2,
          },
          warnings: [],
        };
      },
    }),
  };
}

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

describe("toHaveCalledToolsInOrder", () => {
  const chat = fakeChat([
    { name: "search-products", arguments: {} },
    { name: "render-carousel", arguments: {} },
    { name: "product-details", arguments: {} },
  ]);

  it("matches a subsequence, so unrelated calls in between are fine", () => {
    expect
      .chat(chat)
      .toHaveCalledToolsInOrder(
        "search-products" as never,
        "product-details" as never,
      );
  });

  it("names the tool that never came, and reports the calls made", () => {
    expect(() =>
      expect
        .chat(chat)
        .toHaveCalledToolsInOrder(
          "product-details" as never,
          "search-products" as never,
        ),
    ).toThrow(
      /"search-products" never came after "product-details"[\s\S]*render-carousel/,
    );
  });

  it("skips a failed call, so it cannot satisfy a step", () => {
    const withFailure = fakeChat([
      { name: "search-products", arguments: {} },
      {
        name: "create-checkout",
        arguments: {},
        failed: "the tool returned an error: []",
      },
    ]);

    expect(() =>
      expect
        .chat(withFailure)
        .toHaveCalledToolsInOrder(
          "search-products" as never,
          "create-checkout" as never,
        ),
    ).toThrow(/"create-checkout" never came after "search-products"/);
  });

  it("requires as many calls as the name is repeated", () => {
    expect(() =>
      expect
        .chat(chat)
        .toHaveCalledToolsInOrder(
          "search-products" as never,
          "search-products" as never,
        ),
    ).toThrow(/never came after "search-products"/);
  });
});

describe("toHaveCalledNoTools", () => {
  it("passes on a conversation that called nothing", () => {
    expect.chat(fakeChat([])).toHaveCalledNoTools();
  });

  it("fails with the count and the calls made, failed ones included", () => {
    const chat = fakeChat([
      { name: "clear-cart", arguments: {}, failed: "boom" },
    ]);

    expect(() => expect.chat(chat).toHaveCalledNoTools()).toThrow(
      /not to call any tool, but it made 1 call\.[\s\S]*clear-cart/,
    );
    expect.chat(chat).not.toHaveCalledNoTools();
  });
});

describe("toPassJudgment", () => {
  it("puts the judge's reasoning in the failure message", async () => {
    const chat = judgeChat({
      pass: false,
      reasoning: "The plan totals 640 euros.",
    });

    await expect(
      expect.chat(chat).toPassJudgment("stays under the budget"),
    ).rejects.toThrow(/judge: FAIL\n {2}The plan totals 640 euros\./);

    await expect.chat(chat).not.toPassJudgment("stays under the budget");
  });

  it("tells a broken provider apart from a failed verdict", async () => {
    const chat = judgeChat(new Error("rate limit"));

    await expect(
      expect.chat(chat).not.toPassJudgment("stays under the budget"),
    ).rejects.toThrow("judge unavailable: rate limit");
  });
});

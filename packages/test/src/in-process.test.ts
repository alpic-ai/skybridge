import { MockLanguageModelV2 } from "ai/test";
import { Skybridge } from "skybridge/server";
import { expect, it } from "vitest";
import { z } from "zod";
import { start } from "./session-registry.js";

const usage = { inputTokens: 1, outputTokens: 1, totalTokens: 2 };

function buildApp(seen: string[]) {
  return new Skybridge(
    { name: "in-process-eval", version: "0.0.0", capabilities: {} },
    (server) =>
      server.registerTool(
        {
          name: "search-products",
          description: "Search the catalogue by category",
          inputSchema: { category: z.string() },
        },
        async ({ category }) => {
          seen.push(category);
          return { content: `1 pair of ${category}` };
        },
      ),
  );
}

function mockModel() {
  return new MockLanguageModelV2({
    doGenerate: [
      {
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "search-products",
            input: JSON.stringify({ category: "goggles" }),
          },
        ],
        finishReason: "tool-calls",
        usage,
        warnings: [],
      },
      {
        content: [{ type: "text", text: "I found a pair of goggles." }],
        finishReason: "stop",
        usage,
        warnings: [],
      },
    ],
  });
}

it("serves the session from the app's fetch handler, running tools in-process", async () => {
  const seen: string[] = [];
  const app = buildApp(seen);
  const model = mockModel();

  const chat = await start({ app, model });
  await chat.send("I am looking for ski goggles");

  expect(chat.toolCalls).toEqual([
    { name: "search-products", arguments: { category: "goggles" } },
  ]);
  expect(seen).toEqual(["goggles"]);
  expect(chat.assistantTurns).toEqual(["I found a pair of goggles."]);
  expect(JSON.stringify(model.doGenerateCalls[1]?.prompt)).toContain(
    "1 pair of goggles",
  );
});

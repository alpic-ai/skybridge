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

function buildProtectedApp(seen: string[]) {
  return new Skybridge(
    {
      name: "in-process-auth-eval",
      version: "0.0.0",
      capabilities: {},
      oauth: {
        baseUrl: "http://in-process.skybridge.test",
        oauthMetadata: {
          issuer: "https://issuer.skybridge.test",
          authorization_endpoint: "https://issuer.skybridge.test/authorize",
          token_endpoint: "https://issuer.skybridge.test/token",
          response_types_supported: ["code"],
        },
        verifier: {
          verifyAccessToken: async () => {
            throw new Error("in-process evals never verify a token");
          },
        },
      },
    },
    (server) =>
      server.registerTool(
        {
          name: "create-checkout",
          description: "Start a checkout for a product",
          inputSchema: { productId: z.string() },
          auth: { scopes: ["checkout"] },
        },
        async ({ productId }) => {
          seen.push(productId);
          return { content: `checkout for ${productId}` };
        },
      ),
  );
}

function mockModel(call: {
  toolName: string;
  input: Record<string, unknown>;
  text: string;
}) {
  return new MockLanguageModelV2({
    doGenerate: [
      {
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: call.toolName,
            input: JSON.stringify(call.input),
          },
        ],
        finishReason: "tool-calls",
        usage,
        warnings: [],
      },
      {
        content: [{ type: "text", text: call.text }],
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
  const model = mockModel({
    toolName: "search-products",
    input: { category: "goggles" },
    text: "I found a pair of goggles.",
  });

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

it("enforces the app's own scopes against the injected identity", async () => {
  const anonymousCall = {
    toolName: "create-checkout",
    input: { productId: "sku-1" },
    text: "You need to sign in first.",
  };

  const refused: string[] = [];
  const anonymous = await start({
    app: buildProtectedApp(refused),
    model: mockModel(anonymousCall),
  });
  await anonymous.send("check out the goggles");

  expect(refused).toEqual([]);
  expect(anonymous.toolCalls[0]?.failed).toContain("Sign in to use this tool.");

  const accepted: string[] = [];
  const identified = await start({
    app: buildProtectedApp(accepted),
    model: mockModel({ ...anonymousCall, text: "Your checkout is ready." }),
    authInfo: { token: "t", clientId: "c", scopes: ["checkout"] },
  });
  await identified.send("check out the goggles");

  expect(accepted).toEqual(["sku-1"]);
  expect(identified.toolCalls).toEqual([
    { name: "create-checkout", arguments: { productId: "sku-1" } },
  ]);
  expect(identified.assistantTurns).toEqual(["Your checkout is ready."]);
});

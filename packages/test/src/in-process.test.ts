import { MockLanguageModelV3 } from "ai/test";
import { defineServer, Skybridge } from "skybridge/server";
import { expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { start, type ToolStubs } from "./session-registry.js";

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
  totalTokens: 2,
};

function buildApp(seen: string[]) {
  return new Skybridge({
    name: "in-process-eval",
    version: "0.0.0",
    handler: (server) =>
      server.registerTool(
        {
          name: "search-products",
          description: "Search the catalogue by category",
          inputSchema: { category: z.string() },
        },
        async ({ category }) => {
          seen.push(category);
          return {
            content: `1 pair of ${category}`,
            structuredContent: { sku: "GOG-001" },
            _meta: { imageUrl: "https://cdn.skybridge.test/gog.png" },
          };
        },
      ),
  });
}

function buildProtectedApp(seen: string[]) {
  return new Skybridge({
    name: "in-process-auth-eval",
    version: "0.0.0",
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
    handler: (server) =>
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
  });
}

function mockModel(call: {
  toolName: string;
  input: Record<string, unknown>;
  text: string;
}) {
  return new MockLanguageModelV3({
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
        finishReason: { unified: "tool-calls" as const, raw: undefined },
        usage,
        warnings: [],
      },
      {
        content: [{ type: "text", text: call.text }],
        finishReason: { unified: "stop" as const, raw: undefined },
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
  const prompt = JSON.stringify(model.doGenerateCalls[1]?.prompt);
  expect(prompt).toContain("1 pair of goggles");
  expect(prompt).toContain("GOG-001");
  expect(prompt).not.toContain("cdn.skybridge.test");
});

it("sends a temperature only when one is configured", async () => {
  const call = {
    toolName: "search-products",
    input: { category: "goggles" },
    text: "I found a pair of goggles.",
  };
  const unset = mockModel(call);
  await (await start({ app: buildApp([]), model: unset })).send("goggles");
  const set = mockModel(call);
  await (await start({ app: buildApp([]), model: set, temperature: 0.2 })).send(
    "goggles",
  );

  expect(unset.doGenerateCalls[0]?.temperature).toBeUndefined();
  expect(set.doGenerateCalls[0]?.temperature).toBe(0.2);
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

it("answers from a stub, and falls through to the app when it returns undefined", async () => {
  const stubs = {
    "search-products": ({ category }: { category: string }) =>
      category === "goggles" ? { found: "stubbed goggles" } : undefined,
  };
  const seen: string[] = [];
  const model = mockModel({
    toolName: "search-products",
    input: { category: "goggles" },
    text: "I found the ski goggles.",
  });

  const stubbed = await start({ app: buildApp(seen), model, stubs });
  await stubbed.send("I am looking for ski goggles");

  expect(seen).toEqual([]);
  expect(stubbed.toolCalls).toEqual([
    { name: "search-products", arguments: { category: "goggles" } },
  ]);
  expect(JSON.stringify(model.doGenerateCalls[1]?.prompt)).toContain(
    "stubbed goggles",
  );

  const live = await start({
    app: buildApp(seen),
    model: mockModel({
      toolName: "search-products",
      input: { category: "skis" },
      text: "I found the skis.",
    }),
    stubs,
  });
  await live.send("I am looking for skis");

  expect(seen).toEqual(["skis"]);
});

it("refuses a stub for a tool the app does not expose", async () => {
  await expect(
    start({
      app: buildApp([]),
      model: mockModel({
        toolName: "search-products",
        input: { category: "goggles" },
        text: "",
      }),
      stubs: { "search-produts": () => ({}) } as ToolStubs<
        ReturnType<typeof buildApp>
      >,
    }),
  ).rejects.toThrow('the app exposes no tool named "search-produts"');
});

it("enforces sign-in and scopes before stubs without resolving an HTTP provider", async () => {
  const events: string[] = [];
  const service = defineServer({
    handler: (server) =>
      server
        .registerTool(
          {
            name: "checkout",
            inputSchema: { id: z.string() },
            auth: { scopes: ["checkout"] },
          },
          () => {
            events.push("original");
            return { content: "live" };
          },
        )
        .mcpMiddleware("tools/call", async (_request, _extra, next) => {
          events.push("before");
          const result = await next();
          events.push("after");
          return result;
        }),
  });
  const app = new Skybridge({
    server: service,
    oauth: () => {
      throw new Error("HTTP provider must not resolve during evals");
    },
  });
  for (const scopes of [undefined, [], ["checkout"]]) {
    events.length = 0;
    const chat = await start({
      app,
      model: mockModel({
        toolName: "checkout",
        input: { id: "sku-1" },
        text: "Done.",
      }),
      authInfo:
        scopes === undefined
          ? undefined
          : { token: "test", clientId: "test", scopes },
      stubs: {
        checkout: ({ id }) => {
          expectTypeOf(id).toEqualTypeOf<string>();
          events.push(`stub:${id}`);
          return "stubbed";
        },
      },
    });
    await chat.send("Buy sku-1");
    if (scopes?.includes("checkout")) {
      expect(events).toEqual(["before", "stub:sku-1", "after"]);
      expect.chat(chat).toHaveCalledToolOnce("checkout", { id: "sku-1" });
    } else {
      expect(events).toEqual(["before", "after"]);
      expect.chat(chat).toHaveFailedToolCall("checkout");
    }
    await chat.close();
  }
});

it("owns setup and cleanup per concurrent conversation and cleans up failed startup", async () => {
  let loads = 0;
  const disposed: number[] = [];
  const received: string[] = [];
  const service = defineServer({
    setup: () => ({ id: ++loads, calls: 0 }),
    dispose: ({ id }) => {
      disposed.push(id);
    },
    handler: (server, state) =>
      server.registerTool({ name: "count", inputSchema: {} }, () => {
        received.push(`${state.id}:${++state.calls}`);
        return { content: "counted" };
      }),
  });
  const open = () =>
    start({
      server: service,
      model: mockModel({ toolName: "count", input: {}, text: "Done." }),
    });
  const [first, second] = await Promise.all([open(), open()]);
  expect(loads).toBe(2);
  await Promise.all([first.send("Count"), second.send("Count")]);
  expect(received.sort()).toEqual(["1:1", "2:1"]);
  await Promise.all([first.close(), first.close()]);
  expect(disposed).toEqual([1]);
  await expect(first.send("Again")).rejects.toThrow("closed");
  await second.close();
  expect(disposed).toEqual([1, 2]);
  await expect(
    start({
      server: service,
      model: mockModel({ toolName: "count", input: {}, text: "" }),
      stubs: { missing: () => "wrong" } as ToolStubs<typeof service>,
    }),
  ).rejects.toThrow("no tool named");
  expect(disposed).toEqual([1, 2, 3]);
});

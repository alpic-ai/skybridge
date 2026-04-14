/**
 * ALP-1049: Measure LLM impact of __user_prompt and send_user_feedback
 *
 * Prerequisites:
 *   1. Everything example running: cd examples/everything && pnpm dev
 *   2. Environment variables: ANTHROPIC_API_KEY, OPENAI_API_KEY
 *
 * Run: pnpm test
 */

import { EvalTest, MCPClientManager, TestAgent } from "@mcpjam/sdk";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import "dotenv/config";

const SERVER_URL = process.env.SERVER_URL ?? "http://localhost:3000/mcp";
const ITERATIONS = Number(process.env.ITERATIONS ?? "10");
const CONCURRENCY = Number(process.env.CONCURRENCY ?? "2");
const TIMEOUT_MS = 30_000;

const providers = [
  {
    name: "Claude",
    model: "anthropic/claude-sonnet-4-20250514",
    envKey: "ANTHROPIC_API_KEY",
  },
  { name: "GPT-4o", model: "openai/gpt-4o", envKey: "OPENAI_API_KEY" },
] as const;

describe("ALP-1049: LLM impact eval", () => {
  let manager: MCPClientManager;
  let tools: Awaited<ReturnType<MCPClientManager["getTools"]>>;

  beforeAll(async () => {
    manager = new MCPClientManager();
    await manager.connectToServer("everything", { url: SERVER_URL });
    tools = await manager.getTools();
  }, 30_000);

  afterAll(async () => {
    if (manager) await manager.disconnectServer("everything");
  });

  for (const provider of providers) {
    const apiKey = process.env[provider.envKey];
    if (!apiKey) {
      test.skip(`[${provider.name}] skipped — no ${provider.envKey}`, () => {});
      continue;
    }

    describe(provider.name, () => {
      let agent: TestAgent;

      beforeAll(() => {
        agent = new TestAgent({
          tools,
          model: provider.model,
          apiKey,
          temperature: 0.1,
          maxSteps: 3,
        });
      });

      // ---------------------------------------------------------------
      // A. __user_prompt fill rate
      // ---------------------------------------------------------------

      test("A1: fills __user_prompt on simple greeting", async () => {
        const evalTest = new EvalTest({
          name: "user-prompt-fill-simple",
          test: async (a) => {
            const r = await a.prompt("Say hi to Alice");
            if (!r.hasToolCall("show-everything")) return false;
            const args = r.getToolArguments("show-everything") as Record<
              string,
              unknown
            > | null;
            return (
              args?.name === "Alice" &&
              typeof args?.__user_prompt === "string" &&
              (args.__user_prompt as string).length > 0
            );
          },
        });

        await evalTest.run(agent, {
          iterations: ITERATIONS,
          concurrency: CONCURRENCY,
          timeoutMs: TIMEOUT_MS,
        });
        console.log(
          `  ${provider.name} A1 accuracy: ${(evalTest.accuracy() * 100).toFixed(1)}%`,
        );
        expect(evalTest.accuracy()).toBeGreaterThanOrEqual(0.7);
      }, 600_000);

      test("A2: fills __user_prompt on variant phrasing", async () => {
        const evalTest = new EvalTest({
          name: "user-prompt-fill-variant",
          test: async (a) => {
            const r = await a.prompt("Greet someone called Bob please");
            if (!r.hasToolCall("show-everything")) return false;
            const args = r.getToolArguments("show-everything") as Record<
              string,
              unknown
            > | null;
            return (
              args?.name === "Bob" &&
              typeof args?.__user_prompt === "string" &&
              (args.__user_prompt as string).length > 0
            );
          },
        });

        await evalTest.run(agent, {
          iterations: ITERATIONS,
          concurrency: CONCURRENCY,
          timeoutMs: TIMEOUT_MS,
        });
        console.log(
          `  ${provider.name} A2 accuracy: ${(evalTest.accuracy() * 100).toFixed(1)}%`,
        );
        expect(evalTest.accuracy()).toBeGreaterThanOrEqual(0.7);
      }, 600_000);

      test("A3: __user_prompt is a near-verbatim copy of the prompt", async () => {
        const prompt = "Say hello to Charlie and tell me a joke";
        const evalTest = new EvalTest({
          name: "user-prompt-verbatim-copy",
          test: async (a) => {
            const r = await a.prompt(prompt);
            if (!r.hasToolCall("show-everything")) return false;
            const args = r.getToolArguments("show-everything") as Record<
              string,
              unknown
            > | null;
            const up = args?.__user_prompt as string | undefined;
            if (!up) return false;
            // Should contain key words from the original prompt
            const lower = up.toLowerCase();
            return (
              args?.name === "Charlie" &&
              lower.includes("hello") &&
              lower.includes("joke")
            );
          },
        });

        await evalTest.run(agent, {
          iterations: ITERATIONS,
          concurrency: CONCURRENCY,
          timeoutMs: TIMEOUT_MS,
        });
        console.log(
          `  ${provider.name} A3 accuracy: ${(evalTest.accuracy() * 100).toFixed(1)}%`,
        );
        expect(evalTest.accuracy()).toBeGreaterThanOrEqual(0.5);
      }, 600_000);

      // ---------------------------------------------------------------
      // B. Feedback tool selection
      // ---------------------------------------------------------------

      test("B1: selects feedback tool on positive sentiment", async () => {
        const evalTest = new EvalTest({
          name: "feedback-positive",
          test: async (a) => {
            const r = await a.prompt("I really love this tool, 5 stars!");
            if (!r.hasToolCall("send_user_feedback")) return false;
            const args = r.getToolArguments("send_user_feedback") as Record<
              string,
              unknown
            > | null;
            return typeof args?.rating === "number" && args.rating >= 4;
          },
        });

        await evalTest.run(agent, {
          iterations: ITERATIONS,
          concurrency: CONCURRENCY,
          timeoutMs: TIMEOUT_MS,
        });
        console.log(
          `  ${provider.name} B1 accuracy: ${(evalTest.accuracy() * 100).toFixed(1)}%`,
        );
        expect(evalTest.accuracy()).toBeGreaterThanOrEqual(0.8);
      }, 600_000);

      test("B2: selects feedback tool on negative sentiment", async () => {
        const evalTest = new EvalTest({
          name: "feedback-negative",
          test: async (a) => {
            const r = await a.prompt("This is terrible and broken");
            if (!r.hasToolCall("send_user_feedback")) return false;
            const args = r.getToolArguments("send_user_feedback") as Record<
              string,
              unknown
            > | null;
            return typeof args?.rating === "number" && args.rating <= 2;
          },
        });

        await evalTest.run(agent, {
          iterations: ITERATIONS,
          concurrency: CONCURRENCY,
          timeoutMs: TIMEOUT_MS,
        });
        console.log(
          `  ${provider.name} B2 accuracy: ${(evalTest.accuracy() * 100).toFixed(1)}%`,
        );
        expect(evalTest.accuracy()).toBeGreaterThanOrEqual(0.7);
      }, 600_000);

      test("B3: selects feedback tool on explicit rating", async () => {
        const evalTest = new EvalTest({
          name: "feedback-explicit-rating",
          test: async (a) => {
            const r = await a.prompt("Send feedback: I rate this 3 out of 5");
            if (!r.hasToolCall("send_user_feedback")) return false;
            const args = r.getToolArguments("send_user_feedback") as Record<
              string,
              unknown
            > | null;
            return args?.rating === 3;
          },
        });

        await evalTest.run(agent, {
          iterations: ITERATIONS,
          concurrency: CONCURRENCY,
          timeoutMs: TIMEOUT_MS,
        });
        console.log(
          `  ${provider.name} B3 accuracy: ${(evalTest.accuracy() * 100).toFixed(1)}%`,
        );
        expect(evalTest.accuracy()).toBeGreaterThanOrEqual(0.8);
      }, 600_000);

      // ---------------------------------------------------------------
      // C. No false positives
      // ---------------------------------------------------------------

      test("C1: does NOT call feedback tool on normal greeting", async () => {
        const evalTest = new EvalTest({
          name: "no-false-positive-greet",
          test: async (a) => {
            const r = await a.prompt("Say hi to Alice");
            return !r.hasToolCall("send_user_feedback");
          },
        });

        await evalTest.run(agent, {
          iterations: ITERATIONS,
          concurrency: CONCURRENCY,
          timeoutMs: TIMEOUT_MS,
        });
        console.log(
          `  ${provider.name} C1 accuracy: ${(evalTest.accuracy() * 100).toFixed(1)}%`,
        );
        expect(evalTest.accuracy()).toBeGreaterThanOrEqual(0.9);
      }, 600_000);

      test("C2: does NOT call feedback tool on team greeting", async () => {
        const evalTest = new EvalTest({
          name: "no-false-positive-team",
          test: async (a) => {
            const r = await a.prompt("Greet the whole team");
            return !r.hasToolCall("send_user_feedback");
          },
        });

        await evalTest.run(agent, {
          iterations: ITERATIONS,
          concurrency: CONCURRENCY,
          timeoutMs: TIMEOUT_MS,
        });
        console.log(
          `  ${provider.name} C2 accuracy: ${(evalTest.accuracy() * 100).toFixed(1)}%`,
        );
        expect(evalTest.accuracy()).toBeGreaterThanOrEqual(0.9);
      }, 600_000);

      // ---------------------------------------------------------------
      // D. Argument quality
      // ---------------------------------------------------------------

      test("D1: correct name argument not corrupted by __user_prompt", async () => {
        const evalTest = new EvalTest({
          name: "arg-quality-basic",
          test: async (a) => {
            const r = await a.prompt("Say hi to Alice");
            if (!r.hasToolCall("show-everything")) return false;
            const args = r.getToolArguments("show-everything") as Record<
              string,
              unknown
            > | null;
            return args?.name === "Alice";
          },
        });

        await evalTest.run(agent, {
          iterations: ITERATIONS,
          concurrency: CONCURRENCY,
          timeoutMs: TIMEOUT_MS,
        });
        console.log(
          `  ${provider.name} D1 accuracy: ${(evalTest.accuracy() * 100).toFixed(1)}%`,
        );
        expect(evalTest.accuracy()).toBeGreaterThanOrEqual(0.95);
      }, 600_000);

      test("D2: literal __user_prompt as name value not confused with field", async () => {
        const evalTest = new EvalTest({
          name: "arg-quality-confusing-name",
          test: async (a) => {
            const r = await a.prompt("Greet someone named __user_prompt");
            if (!r.hasToolCall("show-everything")) return false;
            const args = r.getToolArguments("show-everything") as Record<
              string,
              unknown
            > | null;
            return args?.name === "__user_prompt";
          },
        });

        await evalTest.run(agent, {
          iterations: ITERATIONS,
          concurrency: CONCURRENCY,
          timeoutMs: TIMEOUT_MS,
        });
        console.log(
          `  ${provider.name} D2 accuracy: ${(evalTest.accuracy() * 100).toFixed(1)}%`,
        );
        expect(evalTest.accuracy()).toBeGreaterThanOrEqual(0.7);
      }, 600_000);

      // ---------------------------------------------------------------
      // E. Anonymization
      // ---------------------------------------------------------------

      test("E1: anonymizes name in __user_prompt", async () => {
        const evalTest = new EvalTest({
          name: "anon-name",
          test: async (a) => {
            const r = await a.prompt("Say hi to John Smith");
            if (!r.hasToolCall("show-everything")) return false;
            const args = r.getToolArguments("show-everything") as Record<
              string,
              unknown
            > | null;
            const up = (args?.__user_prompt as string | undefined) ?? "";
            // The name arg should still be "John Smith" (tool input)
            // but __user_prompt should have it anonymized
            return (
              args?.name === "John Smith" &&
              !up.includes("John Smith") &&
              /\[NAME\]/i.test(up)
            );
          },
        });

        await evalTest.run(agent, {
          iterations: ITERATIONS,
          concurrency: CONCURRENCY,
          timeoutMs: TIMEOUT_MS,
        });
        console.log(
          `  ${provider.name} E1 accuracy: ${(evalTest.accuracy() * 100).toFixed(1)}%`,
        );
        expect(evalTest.accuracy()).toBeGreaterThanOrEqual(0.5);
      }, 600_000);

      test("E2: anonymizes email in __user_prompt", async () => {
        const evalTest = new EvalTest({
          name: "anon-email",
          test: async (a) => {
            const r = await a.prompt(
              "Say hi to the person at john@example.com",
            );
            if (!r.hasToolCall("show-everything")) return false;
            const args = r.getToolArguments("show-everything") as Record<
              string,
              unknown
            > | null;
            const up = (args?.__user_prompt as string | undefined) ?? "";
            return !up.includes("john@example.com") && /\[EMAIL\]/i.test(up);
          },
        });

        await evalTest.run(agent, {
          iterations: ITERATIONS,
          concurrency: CONCURRENCY,
          timeoutMs: TIMEOUT_MS,
        });
        console.log(
          `  ${provider.name} E2 accuracy: ${(evalTest.accuracy() * 100).toFixed(1)}%`,
        );
        expect(evalTest.accuracy()).toBeGreaterThanOrEqual(0.5);
      }, 600_000);

      test("E3: anonymizes multiple PII types at once", async () => {
        const evalTest = new EvalTest({
          name: "anon-multi-pii",
          test: async (a) => {
            const r = await a.prompt(
              "Say hi to Jane Doe, her email is jane@corp.io and her number is 555-123-4567",
            );
            if (!r.hasToolCall("show-everything")) return false;
            const args = r.getToolArguments("show-everything") as Record<
              string,
              unknown
            > | null;
            const up = (args?.__user_prompt as string | undefined) ?? "";
            return (
              !up.includes("Jane Doe") &&
              !up.includes("jane@corp.io") &&
              !up.includes("555-123-4567")
            );
          },
        });

        await evalTest.run(agent, {
          iterations: ITERATIONS,
          concurrency: CONCURRENCY,
          timeoutMs: TIMEOUT_MS,
        });
        console.log(
          `  ${provider.name} E3 accuracy: ${(evalTest.accuracy() * 100).toFixed(1)}%`,
        );
        expect(evalTest.accuracy()).toBeGreaterThanOrEqual(0.5);
      }, 600_000);
    });
  }
});

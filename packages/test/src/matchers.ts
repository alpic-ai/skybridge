import type { ToolInput, ToolNames } from "skybridge/server";
import { expect } from "vitest";
import type { Chat, ToolCall } from "./chat.js";

/**
 * Assertions about the tool calls a conversation produced. Kept off vitest's
 * global `Matchers` so they never appear on unrelated `expect()` calls, and so
 * this stays the one place later tool-call helpers are added.
 */
export interface ChatMatchers<App> {
  toHaveCalledToolOnce<Name extends ToolNames<App>>(
    name: Name,
    args?: Partial<ToolInput<App, Name>>,
  ): void;
  toHaveCalledToolWith<Name extends ToolNames<App>>(
    name: Name,
    args: Partial<ToolInput<App, Name>>,
  ): void;
  toNeverHaveCalledTool<Name extends ToolNames<App>>(name: Name): void;
}

export interface ChatAssertion<App> extends ChatMatchers<App> {
  not: ChatMatchers<App>;
}

declare module "vitest" {
  interface ExpectStatic {
    chat<App>(chat: Chat<App>): ChatAssertion<App>;
  }
}

function attemptedCalls(
  chat: Chat<unknown>,
  name: string,
): ToolCall<unknown>[] {
  return chat.toolCalls.filter((call) => String(call.name) === name);
}

function acceptedCalls(chat: Chat<unknown>, name: string): ToolCall<unknown>[] {
  return attemptedCalls(chat, name).filter((call) => call.failed === undefined);
}

function observed(chat: Chat<unknown>): string {
  if (chat.toolCalls.length === 0) {
    return "  (no tool was called)";
  }
  return chat.toolCalls
    .map(
      (call: ToolCall<unknown>, index: number) =>
        `  ${index + 1}. ${call.name} ${JSON.stringify(call.arguments)}${call.failed === undefined ? "" : `  (failed: ${call.failed})`}`,
    )
    .join("\n");
}

function definitions(chat: Chat<unknown>): string {
  return chat.toolDefinitions
    .map(
      (tool) =>
        `  - ${tool.name}: ${tool.description ?? ""}\n    arguments: ${JSON.stringify(tool.inputSchema)}`,
    )
    .join("\n");
}

function report(chat: Chat<unknown>, summary: string): string {
  return `${summary}

Calls the model actually made:
${observed(chat)}

Tool definitions the model was looking at:
${definitions(chat)}`;
}

expect.extend({
  toHaveCalledToolOnce(
    received: Chat<unknown>,
    name: string,
    args?: Record<string, unknown>,
  ) {
    const matching = acceptedCalls(received, name);
    const argsMatch =
      args === undefined ||
      (matching.length === 1 &&
        this.equals(matching[0]?.arguments, expect.objectContaining(args)));
    const pass = matching.length === 1 && argsMatch;

    return {
      pass,
      message: () =>
        report(
          received,
          pass
            ? `Expected "${name}" not to be called exactly once.`
            : matching.length === 1
              ? `Expected "${name}" to be called once with ${JSON.stringify(args)}, but it was called with ${JSON.stringify(matching[0]?.arguments)}.`
              : `Expected "${name}" to be called exactly once by a call that succeeded, but ${matching.length} such calls were made.`,
        ),
    };
  },

  toHaveCalledToolWith(
    received: Chat<unknown>,
    name: string,
    args: Record<string, unknown>,
  ) {
    const pass = acceptedCalls(received, name).some((call) =>
      this.equals(call.arguments, expect.objectContaining(args)),
    );

    return {
      pass,
      message: () =>
        report(
          received,
          pass
            ? `Expected no call to "${name}" with ${JSON.stringify(args)}.`
            : `Expected "${name}" to be called with ${JSON.stringify(args)}.`,
        ),
    };
  },

  toNeverHaveCalledTool(received: Chat<unknown>, name: string) {
    const matching = attemptedCalls(received, name);

    return {
      pass: matching.length === 0,
      message: () =>
        report(
          received,
          matching.length === 0
            ? `Expected "${name}" to be called at least once.`
            : `Expected "${name}" never to be called, but it was called ${matching.length} times.`,
        ),
    };
  },
});

expect.chat = <App>(chat: Chat<App>): ChatAssertion<App> =>
  expect(chat) as unknown as ChatAssertion<App>;

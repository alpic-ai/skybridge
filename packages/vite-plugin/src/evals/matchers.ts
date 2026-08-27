import "vitest";
import type { ToolInput, ToolNames } from "skybridge/server";
import { expect } from "vitest";
import type { ChatLike, ToolCall } from "./types.js";

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
  toHaveFailedToolCall<Name extends ToolNames<App>>(name: Name): void;
  toHaveSaid(text: string | RegExp): void;
}

export interface ChatAssertion<App> extends ChatMatchers<App> {
  not: ChatMatchers<App>;
}

declare module "vitest" {
  interface ExpectStatic {
    chat<App>(chat: ChatLike<App>): ChatAssertion<App>;
  }
}

function attemptedCalls(
  chat: ChatLike<unknown>,
  name: string,
): ToolCall<unknown>[] {
  return chat.toolCalls.filter((call) => String(call.name) === name);
}

function acceptedCalls(
  chat: ChatLike<unknown>,
  name: string,
): ToolCall<unknown>[] {
  return attemptedCalls(chat, name).filter((call) => call.failed === undefined);
}

function observed(chat: ChatLike<unknown>): string {
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

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function said(chat: ChatLike<unknown>, text: string | RegExp): boolean {
  return chat.assistantTurns.some((turn) =>
    typeof text === "string"
      ? collapse(turn).toLowerCase().includes(collapse(text).toLowerCase())
      : text.test(turn),
  );
}

function spoken(chat: ChatLike<unknown>): string {
  if (chat.assistantTurns.length === 0) {
    return "  (the assistant said nothing)";
  }
  return chat.assistantTurns
    .map((turn, index) => `  ${index + 1}. ${collapse(turn)}`)
    .join("\n");
}

function report(chat: ChatLike<unknown>, summary: string): string {
  return `${summary}

Calls the model actually made:
${observed(chat)}`;
}

expect.extend({
  toHaveCalledToolOnce(
    received: ChatLike<unknown>,
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
    received: ChatLike<unknown>,
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

  toHaveFailedToolCall(received: ChatLike<unknown>, name: string) {
    const attempted = attemptedCalls(received, name);
    const failed = attempted.filter((call) => call.failed !== undefined);

    return {
      pass: failed.length > 0,
      message: () =>
        report(
          received,
          failed.length > 0
            ? `Expected every call to "${name}" to succeed.`
            : attempted.length === 0
              ? `Expected "${name}" to be called and fail, but it was never called.`
              : `Expected "${name}" to fail, but all ${attempted.length} calls succeeded.`,
        ),
    };
  },

  toHaveSaid(received: ChatLike<unknown>, text: string | RegExp) {
    const pass = said(received, text);
    const wanted = typeof text === "string" ? `"${text}"` : String(text);

    return {
      pass,
      message: () =>
        `${
          pass
            ? `Expected the assistant not to say ${wanted}.`
            : `Expected the assistant to say ${wanted}.`
        }

What the assistant actually said:
${spoken(received)}`,
    };
  },

  toNeverHaveCalledTool(received: ChatLike<unknown>, name: string) {
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

expect.chat = <App>(chat: ChatLike<App>): ChatAssertion<App> =>
  expect(chat) as unknown as ChatAssertion<App>;

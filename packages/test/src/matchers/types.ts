import type { EvalsOptions } from "@skybridge/vite-plugin";
import type { LanguageModel } from "ai";
import type { ToolInput, ToolNames } from "skybridge/server";

/**
 * One recorded call, typed against the project's own registry: `name` is a
 * union of the project's tool names and `arguments` is discriminated on it.
 * `failed` carries the server's reason when the call did not go through.
 */
export type ToolCall<App> = {
  [Name in ToolNames<App>]: {
    name: Name;
    arguments: ToolInput<App, Name>;
    failed?: string;
  };
}[ToolNames<App>];

/**
 * One thing that happened in the conversation. A `tool` turn carries the call
 * itself, so its failure reason lives on the call and `result` holds whatever
 * the server sent back when it went through.
 */
export type Turn<App> =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string }
  | { role: "tool"; call: ToolCall<App>; result?: unknown };

/** The part of a conversation the matchers assert on. */
export interface ChatLike<App> {
  /** Type-only anchor so `expect.chat` infers `App` from the conversation. */
  readonly $app?: App;
  readonly turns: Turn<App>[];
  readonly model: LanguageModel;
}

declare module "vitest" {
  interface ProvidedContext {
    skybridgeEvals: EvalsOptions | undefined;
  }
}

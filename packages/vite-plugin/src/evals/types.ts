import type { ToolInput, ToolNames } from "skybridge/server";
import type { EvalsOptions } from "../plugin.js";

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

/** The part of a conversation the matchers assert on. */
export interface ChatLike<App> {
  readonly toolCalls: ToolCall<App>[];
  readonly assistantTurns: string[];
}

declare module "vitest" {
  interface ProvidedContext {
    skybridgeEvals: EvalsOptions | undefined;
    skybridgeEvalsUrl: string | undefined;
  }
}

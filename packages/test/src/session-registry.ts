import type { LanguageModel } from "ai";
import { inject, onTestFinished } from "vitest";
import { Chat } from "./chat.js";

/**
 * Opens a fresh MCP session and conversation against the server the plugin
 * started. The session is closed when the current test finishes, so scenarios
 * never leak sessions and never write teardown, and tests that run
 * concurrently cannot close each other's sessions.
 *
 * The type parameter pins the assertions to the project's registry:
 * `start<AppType>()` returns a `Chat<AppType>`, and `expect.chat` infers the
 * tool names and argument shapes from it.
 */
export async function start<App>(options: {
  /** Any AI SDK model instance, built by the project. */
  model: LanguageModel;
  systemPrompt?: string;
  temperature?: number;
  maxSteps?: number;
}): Promise<Chat<App>> {
  const url = inject("skybridgeEvalsUrl");
  if (url === undefined) {
    throw new Error(
      "No eval server is running. Add `skybridge({ evals: {...} })` to the vitest config.",
    );
  }
  const config = inject("skybridgeEvals");
  const chat = await Chat.open<App>(url, {
    model: options.model,
    temperature: options.temperature ?? config?.temperature,
    systemPrompt: options.systemPrompt ?? config?.systemPrompt,
    maxSteps: options.maxSteps ?? config?.maxSteps,
  });
  onTestFinished(() => chat.close());
  return chat;
}

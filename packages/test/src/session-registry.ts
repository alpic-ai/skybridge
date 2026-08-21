import { inject, onTestFinished } from "vitest";
import { Chat } from "./chat.js";
import { resolveModel } from "./model.js";

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
export async function start<App>(overrides?: {
  systemPrompt?: string;
  temperature?: number;
}): Promise<Chat<App>> {
  const config = inject("skybridgeEvals");
  const chat = await Chat.open<App>(inject("skybridgeEvalsUrl"), {
    model: await resolveModel(config.model),
    temperature: overrides?.temperature ?? config.temperature,
    systemPrompt: overrides?.systemPrompt ?? config.systemPrompt,
    maxSteps: config.maxSteps,
  });
  onTestFinished(() => chat.close());
  return chat;
}

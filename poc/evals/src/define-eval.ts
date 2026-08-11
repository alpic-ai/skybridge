import { inject, test } from "vitest";
import config from "../skybridge.eval.config.js";
import { Chat } from "./chat.js";

/**
 * One scenario. Each gets a fresh MCP session, so one conversation's calls
 * never leak into the next.
 */
export function defineEval<App>(
  name: string,
  scenario: (chat: Chat<App>) => Promise<void>,
): void {
  test(name, { timeout: 120_000 }, async () => {
    const chat = await Chat.open<App>(inject("mcpUrl"), config.model);
    try {
      await scenario(chat);
    } catch (error) {
      throw enrich(error, chat);
    } finally {
      await chat.close();
    }
  });
}

function enrich(error: unknown, chat: Chat<unknown>): unknown {
  if (!(error instanceof Error)) {
    return error;
  }
  const definitions = chat.toolDefinitions
    .map(
      (tool) =>
        `  - ${tool.name}: ${tool.description ?? ""}\n    arguments: ${JSON.stringify(tool.inputSchema)}`,
    )
    .join("\n");
  error.message = `${error.message}

Tool definitions the model was looking at:
${definitions}`;
  return error;
}

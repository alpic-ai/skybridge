import { useCallback } from "react";
import {
  type FollowUpMessage,
  getAdaptor,
  type SendFollowUpMessageOptions,
} from "../bridges/index.js";

/**
 * Send a follow-up message to the LLM on behalf of the view, as if the user
 * had sent it. Use to chain interactions from view UI (e.g. a button that
 * triggers the next assistant turn).
 *
 * Pass `scrollToBottom: false` to keep the chat scroll position when the host
 * posts the message. This option is Apps-SDK-only; it is silently ignored in
 * the MCP Apps runtime.
 *
 * `prompt` can also be an array of content blocks. On ChatGPT, a text block
 * with `_meta["openai/title"]` becomes a labeled item the user can remove, and
 * `target: "new"` sends the message to a new conversation. Both use the OpenAI
 * MCP extensions: other hosts ignore the title, and `target: "new"` rejects
 * with `NotSupportedError` on hosts that don't advertise `openai/message`.
 *
 * @example
 * ```tsx
 * const send = useSendFollowUpMessage();
 * <button onClick={() => send("Summarize the last 5 results")}>Summarize</button>
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/use-send-follow-up-message
 */
export function useSendFollowUpMessage() {
  const adaptor = getAdaptor();
  const sendFollowUpMessage = useCallback(
    (prompt: FollowUpMessage, options?: SendFollowUpMessageOptions) =>
      adaptor.sendFollowUpMessage(prompt, options),
    [adaptor],
  );

  return sendFollowUpMessage;
}

import { useCallback } from "react";
import {
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
    (prompt: string, options?: SendFollowUpMessageOptions) =>
      adaptor.sendFollowUpMessage(prompt, options),
    [adaptor],
  );

  return sendFollowUpMessage;
}

import { useCallback } from "react";
import { getAdaptor } from "../bridges/index.js";

export function useSendFollowUpMessage() {
  const adaptor = getAdaptor();
  const sendFollowUpMessage = useCallback(
    (prompt: string, options?: { scrollToBottom?: boolean }) =>
      adaptor.sendFollowUpMessage(prompt, options),
    [adaptor],
  );

  return sendFollowUpMessage;
}

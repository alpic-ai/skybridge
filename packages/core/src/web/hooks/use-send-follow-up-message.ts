import { useCallback } from "react";
import { getAdapter } from "../bridges/index.js";

export function useSendFollowUpMessage() {
  const adapter = getAdapter();
  const sendFollowUpMessage = useCallback(
    (prompt: string) => adapter.sendFollowUpMessage(prompt),
    [adapter],
  );

  return sendFollowUpMessage;
}

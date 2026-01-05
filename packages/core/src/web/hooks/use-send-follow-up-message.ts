import { useCallback } from "react";
import { useAdaptor } from "../bridges/index.js";

export function useSendFollowUpMessage() {
  const adaptor = useAdaptor();
  const sendFollowUpMessage = useCallback(
    (prompt: string) => adaptor.sendFollowUpMessage(prompt),
    [adaptor],
  );

  return sendFollowUpMessage;
}

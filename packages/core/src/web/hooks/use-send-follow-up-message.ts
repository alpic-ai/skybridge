import { useCallback } from "react";
import { getAdaptor } from "../bridges/index.js";

export function useSendFollowUpMessage() {
  const adaptor = getAdaptor();
  const sendFollowUpMessage = useCallback(
    (prompt: string) => adaptor.sendFollowUpMessage(prompt),
    [adaptor],
  );

  return sendFollowUpMessage;
}

import { useCallback } from "react";

export function useSendFollowUpMessage() {
  const sendFollowUpMessage = useCallback(
    async (prompt: string): Promise<void> => {
      if (!window.openai?.sendFollowUpMessage) {
        throw new Error("window.openai.sendFollowUpMessage is not available");
      }
      return window.openai.sendFollowUpMessage({ prompt });
    },
    [],
  );

  return sendFollowUpMessage;
}

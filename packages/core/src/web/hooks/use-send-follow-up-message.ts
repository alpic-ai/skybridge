import { useCallback } from "react";
import { getAdaptor } from "../bridges/index.js";
import type { SendFollowUpMessageOptions } from "../bridges/types.js";

export function useSendFollowUpMessage() {
  const adaptor = getAdaptor();
  const sendFollowUpMessage = useCallback(
    (prompt: string, options?: SendFollowUpMessageOptions) =>
      adaptor.sendFollowUpMessage(prompt, options),
    [adaptor],
  );

  return sendFollowUpMessage;
}

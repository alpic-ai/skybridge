import { useCallback } from "react";
import {
  getAdaptor,
  type SendFollowUpMessageOptions,
} from "../bridges/index.js";

export function useSendFollowUpMessage() {
  const adaptor = getAdaptor();
  const sendFollowUpMessage = useCallback(
    (prompt: string, options?: SendFollowUpMessageOptions) =>
      adaptor.sendFollowUpMessage(prompt, options),
    [adaptor],
  );

  return sendFollowUpMessage;
}

import { getBridgeMethods } from "../bridges/index.js";

export function useSendFollowUpMessage() {
  const { sendFollowUpMessage } = getBridgeMethods();

  return sendFollowUpMessage;
}

import { getBridgeMethod } from "../bridges/index.js";

export function useSendFollowUpMessage() {
  return getBridgeMethod("sendFollowUpMessage");
}

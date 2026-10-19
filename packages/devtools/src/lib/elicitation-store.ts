import type {
  ElicitRequestParams,
  ElicitResult,
} from "@modelcontextprotocol/client";
import { create } from "zustand";

export type PendingElicitation = {
  params: ElicitRequestParams;
  respond: (result: ElicitResult) => void;
};

export const useElicitationStore = create<{
  pending: PendingElicitation | null;
}>(() => ({ pending: null }));

export function requestElicitation(
  params: ElicitRequestParams,
  signal: AbortSignal,
): Promise<ElicitResult> {
  useElicitationStore.getState().pending?.respond({ action: "cancel" });
  return new Promise((resolve) => {
    const onAbort = () => respond({ action: "cancel" });
    const respond = (result: ElicitResult) => {
      signal.removeEventListener("abort", onAbort);
      if (useElicitationStore.getState().pending?.respond === respond) {
        useElicitationStore.setState({ pending: null });
      }
      resolve(result);
    };
    if (signal.aborted) {
      resolve({ action: "cancel" });
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    useElicitationStore.setState({ pending: { params, respond } });
  });
}

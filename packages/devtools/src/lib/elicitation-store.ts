import type {
  ElicitRequestParams,
  ElicitResult,
} from "@modelcontextprotocol/client";
import { create } from "zustand";

export type PendingElicitation = {
  id: string;
  params: ElicitRequestParams;
  respond: (result: ElicitResult) => void;
};

export const useElicitationStore = create<{ queue: PendingElicitation[] }>(
  () => ({ queue: [] }),
);

export function requestElicitation(
  params: ElicitRequestParams,
  signal: AbortSignal,
): Promise<ElicitResult> {
  return new Promise((resolve) => {
    const pending: PendingElicitation = {
      id: crypto.randomUUID(),
      params,
      respond: (result) => {
        useElicitationStore.setState(({ queue }) => ({
          queue: queue.filter((item) => item !== pending),
        }));
        resolve(result);
      },
    };
    if (signal.aborted) {
      resolve({ action: "cancel" });
      return;
    }
    signal.addEventListener(
      "abort",
      () => pending.respond({ action: "cancel" }),
      { once: true },
    );
    useElicitationStore.setState(({ queue }) => ({
      queue: [...queue, pending],
    }));
  });
}

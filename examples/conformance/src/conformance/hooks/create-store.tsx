import { useRef } from "react";
import { createStore, useHostContext } from "skybridge/web";
import { useAsyncAuto } from "../context.js";
import type { HookDef } from "../types.js";

/** Resolve after the host has had a chance to echo viewState back. */
const nextTick = () => new Promise((resolve) => setTimeout(resolve, 80));

type CounterState = {
  count: number;
  inc: () => void;
};

const useCounterStore = createStore<CounterState>((set) => ({
  count: 0,
  inc: () => set((s) => ({ count: s.count + 1 })),
}));

function StoreMember() {
  useAsyncAuto(async () => {
    // Zustand updates synchronously, so the new value is readable at once.
    const before = useCounterStore.getState().count;
    useCounterStore.getState().inc();
    const after = useCounterStore.getState().count;
    return after === before + 1
      ? {
          support: "supported" as const,
          detail: `store action updated state (count ${before} -> ${after})`,
        }
      : {
          support: "error" as const,
          detail: `expected ${before + 1}, store reports ${after}`,
        };
  });
  return null;
}

function HostSyncMember() {
  const raw = useHostContext("viewState") as { count?: number } | null;
  const rawRef = useRef(raw);
  rawRef.current = raw;
  useAsyncAuto(async () => {
    useCounterStore.getState().inc();
    const expected = useCounterStore.getState().count;
    await nextTick();
    return rawRef.current?.count === expected
      ? {
          support: "supported" as const,
          detail: `host viewState synced to count=${expected}`,
        }
      : {
          support: "unsupported" as const,
          detail: `host did not echo the store state back (count=${rawRef.current?.count ?? "none"})`,
        };
  });
  return null;
}

export const createStoreHook: HookDef = {
  name: "createStore",
  source: "skybridge/web",
  docPath: "create-store",
  summary: "A Zustand store bidirectionally synced with the host viewState.",
  members: [
    {
      id: "createStore.store",
      name: "store + actions",
      description: "The store initializes and actions update the state.",
      kind: "auto",
      serialized: true,
      Test: StoreMember,
    },
    {
      id: "createStore.hostSync",
      name: "host sync",
      description: "Store changes are persisted to the host viewState.",
      kind: "auto",
      serialized: true,
      Test: HostSyncMember,
    },
  ],
};

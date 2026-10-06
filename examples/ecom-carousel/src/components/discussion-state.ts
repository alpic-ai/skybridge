import { useEffect, useSyncExternalStore } from "react";
import type { ModelContextState } from "skybridge/web";

type Content = NonNullable<NonNullable<ModelContextState>["content"]>;
let snapshot: { pending: boolean; content: Content } = {
  pending: false,
  content: [],
};
let lastHostKey: string | null | undefined;
const listeners = new Set<() => void>();
function publish(next: typeof snapshot) {
  snapshot = next;
  for (const listener of listeners) {
    listener();
  }
}
export function reconcileDiscussion(
  context: ModelContextState | null | undefined,
) {
  const key = context?.updateId ?? (context === null ? null : undefined);
  if (key !== lastHostKey) {
    lastHostKey = key;
    publish({ pending: snapshot.pending, content: context?.content ?? [] });
  }
}
export function useDiscussionState(
  context: ModelContextState | null | undefined,
) {
  useEffect(() => {
    reconcileDiscussion(context);
  }, [context]);
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
  );
}
export async function updateDiscussion(
  change: (content: Content) => Content,
  update: (content: Content) => Promise<unknown>,
) {
  if (snapshot.pending) {
    return;
  }
  const previous = snapshot.content;
  const content = change(previous);
  publish({ pending: true, content });
  try {
    await update(content);
  } catch (error) {
    publish({ pending: false, content: previous });
    throw error;
  }
  publish({ ...snapshot, pending: false });
}

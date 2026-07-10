import { useEffect, useRef } from "react";

/**
 * The app's remote-control protocol, used by external drivers (e.g. the Notte
 * conformance function in `scripts/`) that cannot click or read across the
 * host's cross-origin iframes:
 *
 * - Inbound: the driver posts `{type: "conformance:drive", action}` into the
 *   view window; {@link useDriveListener} dispatches the action.
 * - Outbound: {@link useStateBroadcast} posts `{type: "conformance:state",
 *   state}` to the embedding page (`window.top` is reachable cross-origin for
 *   postMessage) on every render plus a heartbeat, so a driver that attached
 *   late still gets a snapshot within a beat.
 *
 * Neither hook knows anything about the conformance runner; the caller
 * supplies the dispatch and the state snapshot.
 */
export type DriveAction =
  | "run"
  | "skip"
  | "yes"
  | "no"
  | "close-modal"
  | "restore-inline";

const DRIVE_MESSAGE = "conformance:drive";
const STATE_MESSAGE = "conformance:state";
const HEARTBEAT_MS = 1500;

/** Dispatch `conformance:drive` messages to `onAction` (always the latest). */
export function useDriveListener(onAction: (action: DriveAction) => void) {
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; action?: string } | null;
      if (data?.type === DRIVE_MESSAGE) {
        onActionRef.current(data.action as DriveAction);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
}

function post(state: Record<string, unknown>) {
  const message = { type: STATE_MESSAGE, state };
  try {
    window.top?.postMessage(message, "*");
  } catch {
    // window.top can be inaccessible in exotic sandboxes.
  }
  if (window.parent && window.parent !== window.top) {
    try {
      window.parent.postMessage(message, "*");
    } catch {
      // Same.
    }
  }
}

/** Broadcast `buildState()` on every render plus a {@link HEARTBEAT_MS} heartbeat. */
export function useStateBroadcast(buildState: () => Record<string, unknown>) {
  const buildStateRef = useRef(buildState);
  buildStateRef.current = buildState;
  // No dependency array: intentionally re-broadcasts after every render.
  useEffect(() => {
    post(buildStateRef.current());
  });
  useEffect(() => {
    const timer = setInterval(
      () => post(buildStateRef.current()),
      HEARTBEAT_MS,
    );
    return () => clearInterval(timer);
  }, []);
}

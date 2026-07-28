import { useEffect, useRef } from "react";

/**
 * The app's remote-control protocol, used by external drivers (the Playwright
 * driver in `notte/conformance.py`) that cannot click or read across the
 * host's cross-origin iframes:
 *
 * - Inbound: the driver posts `{type: "conformance:drive", action}` into the
 *   view window; {@link useDriveListener} dispatches the action.
 * - Outbound: {@link useStateBroadcast} posts `{type: "conformance:state",
 *   state}` to the embedding page (`window.top` is reachable cross-origin for
 *   postMessage) on every render plus a heartbeat, so a driver that attached
 *   late still gets a snapshot within a beat.
 * - Handshake: the broadcast stays silent until a driver posts `{type:
 *   "conformance:attach"}`. These state messages are not JSON-RPC, and
 *   ChatGPT's sandbox proxy runs an `ext-apps` transport old enough to
 *   `console.error("Failed to parse message", …)` on every non-JSON-RPC
 *   message reaching its window — so an unsolicited heartbeat floods the host
 *   console. Drivers re-announce on each poll, which also re-arms the app
 *   after a host-driven remount.
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
const ATTACH_MESSAGE = "conformance:attach";
const HEARTBEAT_MS = 1500;

// Module scope, not a hook: the attach can land before the view mounts, and it
// must outlive the remounts the host triggers (fullscreen, modal).
let attached = false;
if (typeof window !== "undefined") {
  window.addEventListener("message", (event: MessageEvent) => {
    if ((event.data as { type?: string } | null)?.type === ATTACH_MESSAGE) {
      attached = true;
    }
  });
}

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
  if (!attached) {
    return;
  }
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

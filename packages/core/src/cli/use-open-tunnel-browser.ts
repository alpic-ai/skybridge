import open from "open";
import { useEffect, useRef } from "react";
import type { TunnelState } from "./use-tunnel.js";

/**
 * Opens the tunnel URL in the browser once the tunnel reaches "connected"
 * state. Fires at most once per mount.
 */
export function useOpenTunnelBrowser(
  tunnelState: TunnelState,
  enabled: boolean,
): void {
  const opened = useRef(false);

  useEffect(() => {
    if (!enabled || opened.current) {
      return;
    }
    if (tunnelState.status === "connected") {
      opened.current = true;
      void open(tunnelState.url).catch(() => {});
    }
  }, [tunnelState, enabled]);
}

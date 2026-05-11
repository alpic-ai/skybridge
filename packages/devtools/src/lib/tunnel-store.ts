import { useEffect } from "react";
import { create } from "zustand";

export type TunnelState =
  | { status: "idle" }
  | { status: "starting"; message: string }
  | { status: "connected"; url: string }
  | { status: "error"; message: string };

type TunnelStore = {
  state: TunnelState;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  connect: () => () => void;
};

const TUNNEL_PATH = "/__skybridge/tunnel";

export const useTunnelStore = create<TunnelStore>()((set, get) => ({
  state: { status: "idle" },

  async start() {
    if (
      get().state.status === "starting" ||
      get().state.status === "connected"
    ) {
      return;
    }
    set({ state: { status: "starting", message: "Starting tunnel…" } });
    try {
      const res = await fetch(TUNNEL_PATH, { method: "POST" });
      if (!res.ok) {
        throw new Error(`Tunnel start failed (${res.status})`);
      }
    } catch (err) {
      if (get().state.status !== "connected") {
        set({
          state: {
            status: "error",
            message:
              err instanceof Error ? err.message : "Failed to start tunnel",
          },
        });
      }
    }
  },

  async stop() {
    try {
      await fetch(TUNNEL_PATH, { method: "DELETE" });
    } catch {
      // ignore — SSE will reconcile state
    }
  },

  connect() {
    const source = new EventSource(`${TUNNEL_PATH}/events`);

    source.addEventListener("state", (event) => {
      if (!(event instanceof MessageEvent)) {
        return;
      }
      try {
        set({ state: JSON.parse(event.data) });
      } catch {
        // ignore malformed frame
      }
    });

    source.addEventListener("error", () => {
      if (source.readyState === EventSource.CLOSED) {
        set({
          state: {
            status: "error",
            message: "Lost tunnel connection",
          },
        });
      }
    });

    return () => {
      source.close();
    };
  },
}));

export function useConnectTunnel() {
  const connect = useTunnelStore((s) => s.connect);
  useEffect(() => connect(), [connect]);
}

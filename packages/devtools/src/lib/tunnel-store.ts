import { useEffect } from "react";
import { z } from "zod";
import { create } from "zustand";

const tunnelStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("idle") }),
  z.object({ status: z.literal("starting"), message: z.string() }),
  z.object({ status: z.literal("connected"), url: z.string() }),
  z.object({ status: z.literal("error"), message: z.string() }),
]);

export type TunnelState = z.infer<typeof tunnelStateSchema>;

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
        const parsed = tunnelStateSchema.safeParse(JSON.parse(event.data));
        if (parsed.success) {
          set({ state: parsed.data });
        }
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

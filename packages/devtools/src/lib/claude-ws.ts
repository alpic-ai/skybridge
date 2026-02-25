import { create } from "zustand";

type Status = "idle" | "connecting" | "connected" | "disconnected" | "error";

interface ClaudeWsState {
  status: Status;
  pid: number | undefined;
  error: string | undefined;
  _ws: WebSocket | null;
  _onData: ((data: string) => void) | null;
}

interface ClaudeWsActions {
  connect(): void;
  disconnect(): void;
  sendInput(data: string): void;
  sendResize(cols: number, rows: number): void;
  sendRestart(): void;
  setOnData(cb: (data: string) => void): void;
}

type ClaudeWsStore = ClaudeWsState & ClaudeWsActions;

function getWsUrl(): string {
  const port =
    (typeof window !== "undefined" &&
      (window as unknown as { __CLAUDE_WS_PORT__?: number }).__CLAUDE_WS_PORT__) ||
    3001;
  const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return `ws://${hostname}:${port}`;
}

function sendJson(ws: WebSocket | null, msg: object) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export const useClaudeWs = create<ClaudeWsStore>((set, get) => ({
  status: "idle",
  pid: undefined,
  error: undefined,
  _ws: null,
  _onData: null,

  connect() {
    const existing = get()._ws;
    if (existing) {
      existing.close();
    }

    set({ status: "connecting", error: undefined });

    const ws = new WebSocket(getWsUrl());

    ws.onopen = () => {
      set({ status: "connected", _ws: ws });
    };

    ws.onmessage = (event) => {
      let msg: { type: string; data?: string; pid?: number; code?: number | null };
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      if (msg.type === "output" && msg.data !== undefined) {
        get()._onData?.(msg.data);
      } else if (msg.type === "started") {
        set({ pid: msg.pid });
      } else if (msg.type === "exit") {
        set({ pid: undefined });
      }
    };

    ws.onerror = () => {
      set({ status: "error", error: "WebSocket connection failed" });
    };

    ws.onclose = () => {
      set((state) => ({
        status: state.status === "error" ? "error" : "disconnected",
        _ws: null,
        pid: undefined,
      }));
    };

    set({ _ws: ws });
  },

  disconnect() {
    const ws = get()._ws;
    if (ws) {
      ws.close();
    }
    set({ status: "idle", _ws: null, pid: undefined });
  },

  sendInput(data) {
    sendJson(get()._ws, { type: "input", data });
  },

  sendResize(cols, rows) {
    sendJson(get()._ws, { type: "resize", cols, rows });
  },

  sendRestart() {
    sendJson(get()._ws, { type: "restart" });
  },

  setOnData(cb) {
    set({ _onData: cb });
  },
}));

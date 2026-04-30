import { useEffect, useState } from "react";
import type { PushMessage } from "./use-messages.js";

export type TunnelState =
  | { status: "idle" }
  | { status: "starting"; message: string }
  | { status: "connected"; url: string }
  | { status: "error"; message: string };

type TunnelActivity = {
  time: string;
  text: string;
  level: "log" | "error";
};

const POST_RETRY_BUDGET_MS = 5_000;
const POST_RETRY_DELAY_MS = 250;

export function useTunnel(
  port: number | null,
  pushMessage: PushMessage,
  verbose: boolean,
): TunnelState {
  const [state, setState] = useState<TunnelState>(
    port === null
      ? { status: "idle" }
      : { status: "starting", message: "Starting tunnel…" },
  );

  useEffect(() => {
    if (port === null) {
      return;
    }

    const baseUrl = `http://localhost:${port}`;
    const controller = new AbortController();
    let cancelled = false;

    const pushLog = (text: string, type: "log" | "error") => {
      const time = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      pushMessage(`${time} [tunnel] ${text}`, type);
    };

    const handleEvent = (event: string, data: string) => {
      if (event === "state") {
        const next = JSON.parse(data) as TunnelState;
        setState(next);
        return;
      }
      if (event === "activity") {
        if (!verbose) {
          return;
        }
        const activity = JSON.parse(data) as TunnelActivity;
        pushLog(activity.text, activity.level);
      }
    };

    const consumeSse = async () => {
      const res = await fetch(`${baseUrl}/tunnel/events`, {
        signal: controller.signal,
        headers: { Accept: "text/event-stream" },
      });
      if (!res.ok || !res.body) {
        throw new Error(`SSE connection failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!cancelled) {
        const { value, done } = await reader.read();
        if (done) {
          return;
        }
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by a blank line ("\n\n").
        let sep = buffer.indexOf("\n\n");
        while (sep !== -1) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          let eventName = "message";
          const dataLines: string[] = [];
          for (const rawLine of frame.split("\n")) {
            const line = rawLine.replace(/\r$/, "");
            if (line.startsWith("event:")) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataLines.push(line.slice(5).trimStart());
            }
          }
          if (dataLines.length > 0) {
            handleEvent(eventName, dataLines.join("\n"));
          }
          sep = buffer.indexOf("\n\n");
        }
      }
    };

    const postWithRetry = async () => {
      const deadline = Date.now() + POST_RETRY_BUDGET_MS;
      while (!cancelled) {
        try {
          const res = await fetch(`${baseUrl}/tunnel`, {
            method: "POST",
            signal: controller.signal,
          });
          if (res.ok) {
            return true;
          }
        } catch {
          // dev server not up yet
        }
        if (Date.now() >= deadline) {
          setState({
            status: "error",
            message: "Could not reach dev server to start tunnel",
          });
          return false;
        }
        await new Promise((r) => setTimeout(r, POST_RETRY_DELAY_MS));
      }
      return false;
    };

    void postWithRetry().then((ok) => {
      if (!ok || cancelled) {
        return;
      }
      consumeSse().catch(() => {
        // Aborted on unmount or transient stream error; the dev server owns
        // the subprocess lifecycle, so we don't surface this as fatal.
      });
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [port, pushMessage, verbose]);

  return state;
}

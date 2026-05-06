import net from "node:net";
import open from "open";
import { useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 200;
const POLL_TIMEOUT_MS = 5_000;

const isPortListening = (port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = net.createConnection({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });

export function useOpenBrowser(port: number, enabled: boolean): void {
  const opened = useRef(false);

  useEffect(() => {
    if (!enabled || opened.current) {
      return;
    }

    let cancelled = false;
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    const tick = async () => {
      while (!cancelled && Date.now() < deadline) {
        if (await isPortListening(port)) {
          if (cancelled || opened.current) {
            return;
          }
          opened.current = true;
          await open(`http://localhost:${port}/`).catch(() => {});
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    };

    void tick();

    return () => {
      cancelled = true;
    };
  }, [port, enabled]);
}

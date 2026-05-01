import type { IncomingMessage, ServerResponse } from "node:http";
import type { TunnelActivity, TunnelManager, TunnelState } from "./tunnel.js";

export function createTunnelHandler(manager: TunnelManager) {
  return (req: IncomingMessage, res: ServerResponse): void => {
    if (req.url === "/tunnel" && req.method === "POST") {
      manager.start();
      sendJson(res, 200, manager.getState());
      return;
    }
    if (req.url === "/tunnel" && req.method === "DELETE") {
      manager.stop();
      sendJson(res, 200, manager.getState());
      return;
    }
    if (req.url === "/tunnel/events" && req.method === "GET") {
      writeSseHead(res);
      writeSse(res, "state", manager.getState());
      const onState = (s: TunnelState) => {
        writeSse(res, "state", s);
      };
      const onActivity = (a: TunnelActivity) => {
        writeSse(res, "activity", a);
      };
      manager.on("state", onState);
      manager.on("activity", onActivity);
      req.on("close", () => {
        manager.off("state", onState);
        manager.off("activity", onActivity);
      });
      return;
    }
    res.writeHead(404).end();
  };
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function writeSseHead(res: ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  res.flushHeaders?.();
}

function writeSse(res: ServerResponse, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

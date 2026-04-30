import express, { type Router } from "express";
import type { TunnelActivity, TunnelManager, TunnelState } from "./tunnel.js";

export function createTunnelRouter(manager: TunnelManager): Router {
  const router = express.Router();

  router.post("/tunnel", (_req, res) => {
    manager.start();
    res.json(manager.getState());
  });

  router.delete("/tunnel", (_req, res) => {
    manager.stop();
    res.json(manager.getState());
  });

  router.get("/tunnel/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    send("state", manager.getState());

    const onState = (s: TunnelState) => send("state", s);
    const onActivity = (a: TunnelActivity) => send("activity", a);
    manager.on("state", onState);
    manager.on("activity", onActivity);

    req.on("close", () => {
      manager.off("state", onState);
      manager.off("activity", onActivity);
    });
  });

  return router;
}

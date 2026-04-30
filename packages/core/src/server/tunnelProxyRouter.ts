import express, { type Router } from "express";

/**
 * Builds an Express router that forwards `/tunnel` (POST/DELETE) and
 * `/tunnel/events` (GET, SSE) to the cli's loopback control server.
 */
export function createTunnelProxyRouter(controlPort: number): Router {
  const router = express.Router();
  const upstream = `http://127.0.0.1:${controlPort}`;

  const forwardJson = async (
    method: "POST" | "DELETE",
    res: express.Response,
  ): Promise<void> => {
    try {
      const upstreamRes = await fetch(`${upstream}/tunnel`, { method });
      const body = await upstreamRes.text();
      res
        .status(upstreamRes.status)
        .type(upstreamRes.headers.get("content-type") ?? "application/json")
        .send(body);
    } catch (err) {
      res.status(502).json({
        status: "error",
        message:
          err instanceof Error ? err.message : "Tunnel control unavailable",
      });
    }
  };

  router.post("/tunnel", (_req, res) => {
    void forwardJson("POST", res);
  });

  router.delete("/tunnel", (_req, res) => {
    void forwardJson("DELETE", res);
  });

  router.get("/tunnel/events", async (req, res) => {
    // Abort the upstream fetch when the client disconnects (or when the dev
    // server shuts down and destroys the response).
    const controller = new AbortController();
    const onClose = () => controller.abort();
    req.on("close", onClose);

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(`${upstream}/tunnel/events`, {
        signal: controller.signal,
      });
    } catch (err) {
      req.off("close", onClose);
      if (!res.headersSent) {
        res.status(502).json({
          status: "error",
          message:
            err instanceof Error ? err.message : "Tunnel control unavailable",
        });
      }
      return;
    }

    const upstreamBody = upstreamRes.body;
    if (!upstreamRes.ok || !upstreamBody) {
      req.off("close", onClose);
      res.status(upstreamRes.status).end();
      return;
    }

    res.setHeader(
      "Content-Type",
      upstreamRes.headers.get("content-type") ?? "text/event-stream",
    );
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const reader = upstreamBody.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        if (!res.write(value)) {
          await new Promise<void>((resolve) => res.once("drain", resolve));
        }
      }
    } catch {
      // upstream aborted (typically because the client disconnected) —
      // fall through to end()
    } finally {
      req.off("close", onClose);
      // Release the reader so the upstream stream's lifecycle isn't held by
      // a lingering lock on the clean-done path.
      try {
        await reader.cancel();
      } catch {
        // ignore — the reader may already be closed
      }
      res.end();
    }
  });

  return router;
}

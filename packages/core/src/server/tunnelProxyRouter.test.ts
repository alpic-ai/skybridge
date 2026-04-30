import { EventEmitter } from "node:events";
import http from "node:http";
import { Readable } from "node:stream";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { startTunnelControlServer } from "../cli/tunnel-control-server.js";
import { createTunnelProxyRouter } from "./tunnelProxyRouter.js";

type FakeChild = EventEmitter & {
  stdout: Readable;
  stderr: Readable;
  kill: ReturnType<typeof vi.fn<() => boolean>>;
};

function makeFakeChild(): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdout = new Readable({ read() {} });
  child.stderr = new Readable({ read() {} });
  child.kill = vi.fn<() => boolean>(() => true);
  return child;
}

async function listen(handler: http.RequestListener) {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  return { port, server };
}

type Cleanup = () => Promise<void> | void;
const cleanups: Cleanup[] = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();
    if (cleanup) {
      await cleanup();
    }
  }
});

async function startProxy(controlPort: number) {
  const app = express();
  app.use(createTunnelProxyRouter(controlPort));
  const { port, server } = await listen(app);
  cleanups.push(
    () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  );
  return { port, server };
}

async function startControl() {
  const child = makeFakeChild();
  const control = await startTunnelControlServer(() => 3000, {
    spawn: () => child,
  });
  cleanups.push(() => control.close());
  return { control, child };
}

describe("createTunnelProxyRouter", () => {
  describe("POST /tunnel", () => {
    it("forwards to upstream and returns the upstream JSON", async () => {
      const { control } = await startControl();
      const { port } = await startProxy(control.port);

      const res = await fetch(`http://127.0.0.1:${port}/tunnel`, {
        method: "POST",
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toMatch(/application\/json/);
      expect(await res.json()).toEqual({
        status: "starting",
        message: "Starting tunnel…",
      });
      expect(control.manager.getState().status).toBe("starting");
    });

    it("returns 502 when upstream is unavailable", async () => {
      // Pick a port nothing is listening on by starting+stopping a server.
      const probe = http.createServer();
      await new Promise<void>((resolve) =>
        probe.listen(0, "127.0.0.1", resolve),
      );
      const deadPort = (probe.address() as { port: number }).port;
      await new Promise<void>((resolve) => probe.close(() => resolve()));

      const { port } = await startProxy(deadPort);

      const res = await fetch(`http://127.0.0.1:${port}/tunnel`, {
        method: "POST",
      });
      expect(res.status).toBe(502);
      const body = (await res.json()) as { status: string; message: string };
      expect(body.status).toBe("error");
      expect(typeof body.message).toBe("string");
    });
  });

  describe("DELETE /tunnel", () => {
    it("forwards to upstream and returns the upstream JSON", async () => {
      const { control, child } = await startControl();
      const { port } = await startProxy(control.port);

      // First start the tunnel so DELETE has something to stop.
      await fetch(`http://127.0.0.1:${port}/tunnel`, { method: "POST" });

      const res = await fetch(`http://127.0.0.1:${port}/tunnel`, {
        method: "DELETE",
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: "idle" });
      expect(child.kill).toHaveBeenCalled();
    });

    it("returns 502 when upstream is unavailable", async () => {
      const probe = http.createServer();
      await new Promise<void>((resolve) =>
        probe.listen(0, "127.0.0.1", resolve),
      );
      const deadPort = (probe.address() as { port: number }).port;
      await new Promise<void>((resolve) => probe.close(() => resolve()));

      const { port } = await startProxy(deadPort);

      const res = await fetch(`http://127.0.0.1:${port}/tunnel`, {
        method: "DELETE",
      });
      expect(res.status).toBe(502);
    });
  });

  describe("GET /tunnel/events", () => {
    it("pipes the upstream SSE stream through to the client", async () => {
      const { control, child } = await startControl();
      const { port } = await startProxy(control.port);

      // Get the manager into a known state so the initial SSE frame is
      // deterministic.
      await fetch(`http://127.0.0.1:${port}/tunnel`, { method: "POST" });
      child.stdout.emit(
        "data",
        Buffer.from(
          "Forwarding: https://abc.tunnel.example -> http://localhost:3000\n",
        ),
      );

      const res = await fetch(`http://127.0.0.1:${port}/tunnel/events`);

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toMatch(/text\/event-stream/);
      expect(res.headers.get("cache-control")).toMatch(/no-cache/);

      const body = res.body;
      if (!body) {
        throw new Error("expected response body");
      }
      const reader = body.getReader();
      const { value } = await reader.read();
      const chunk = new TextDecoder().decode(value);

      expect(chunk).toContain("event: state");
      expect(chunk).toContain('"status":"connected"');
      expect(chunk).toContain('"url":"https://abc.tunnel.example"');

      await reader.cancel();
    });

    it("forwards subsequent state changes through the SSE stream", async () => {
      const { control, child } = await startControl();
      const { port } = await startProxy(control.port);

      await fetch(`http://127.0.0.1:${port}/tunnel`, { method: "POST" });

      const res = await fetch(`http://127.0.0.1:${port}/tunnel/events`);
      const body = res.body;
      if (!body) {
        throw new Error("expected response body");
      }
      const reader = body.getReader();
      const decoder = new TextDecoder();

      // Drain the initial "starting" frame.
      const first = await reader.read();
      expect(decoder.decode(first.value)).toContain('"status":"starting"');

      // Now drive a state change on the manager and read the next frame.
      child.stdout.emit(
        "data",
        Buffer.from(
          "Forwarding: https://abc.tunnel.example -> http://localhost:3000\n",
        ),
      );

      let combined = "";
      // Reads may chunk arbitrarily, so accumulate until we see the connected
      // event or hit a sane cap.
      for (let i = 0; i < 5; i++) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        combined += decoder.decode(value);
        if (combined.includes('"status":"connected"')) {
          break;
        }
      }
      expect(combined).toContain('"status":"connected"');
      expect(combined).toContain('"url":"https://abc.tunnel.example"');

      await reader.cancel();
    });

    it("returns 502 when upstream is unavailable", async () => {
      const probe = http.createServer();
      await new Promise<void>((resolve) =>
        probe.listen(0, "127.0.0.1", resolve),
      );
      const deadPort = (probe.address() as { port: number }).port;
      await new Promise<void>((resolve) => probe.close(() => resolve()));

      const { port } = await startProxy(deadPort);

      const res = await fetch(`http://127.0.0.1:${port}/tunnel/events`);
      expect(res.status).toBe(502);
      const body = (await res.json()) as { status: string };
      expect(body.status).toBe("error");
    });

    it("aborts the upstream connection when the proxy server is closed mid-stream", async () => {
      const { control } = await startControl();
      const { port, server } = await startProxy(control.port);

      await fetch(`http://127.0.0.1:${port}/tunnel`, { method: "POST" });

      // Snapshot the manager's listener counts before the SSE subscription so
      // we can verify the proxy disconnected from upstream after shutdown.
      const baseStateListeners = control.manager.listenerCount("state");
      const baseActivityListeners = control.manager.listenerCount("activity");

      const res = await fetch(`http://127.0.0.1:${port}/tunnel/events`);
      const body = res.body;
      if (!body) {
        throw new Error("expected response body");
      }
      const reader = body.getReader();
      // Drain the first frame to confirm the stream is live and the upstream
      // SSE handler has subscribed to the manager.
      await reader.read();
      expect(control.manager.listenerCount("state")).toBe(
        baseStateListeners + 1,
      );

      // Close the proxy server, destroying in-flight responses. The proxy's
      // req.on("close", ...) should fire and abort the upstream fetch.
      server.closeAllConnections?.();
      await new Promise<void>((resolve) => server.close(() => resolve()));

      // The client-side stream is dead — drain or fail, either is acceptable.
      try {
        while (true) {
          const { done } = await reader.read();
          if (done) {
            break;
          }
        }
      } catch {
        // expected: socket terminated when proxy server was destroyed
      }

      // Wait briefly for the upstream's req.on("close") to fire, then assert
      // the manager listeners were detached. This is the load-bearing
      // verification: it proves the proxy's AbortController propagated and
      // upstream cleaned up its SSE subscription.
      const start = Date.now();
      while (
        control.manager.listenerCount("state") > baseStateListeners &&
        Date.now() - start < 1000
      ) {
        await new Promise((r) => setTimeout(r, 20));
      }
      expect(control.manager.listenerCount("state")).toBe(baseStateListeners);
      expect(control.manager.listenerCount("activity")).toBe(
        baseActivityListeners,
      );
    });
  });
});

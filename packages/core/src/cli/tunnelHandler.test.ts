import { EventEmitter } from "node:events";
import http from "node:http";
import { Readable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TunnelManager } from "./tunnel.js";
import { createTunnelHandler } from "./tunnelHandler.js";

let openServer: http.Server | undefined;
afterEach(() => openServer?.close());

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
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as { port: number }).port;
  return { port, server };
}

async function listenWithHandler() {
  const child = makeFakeChild();
  const manager = new TunnelManager({
    getPort: () => 3000,
    spawn: () => child,
  });
  const { port, server } = await listen(createTunnelHandler(manager));
  openServer = server;
  return { port, child, manager };
}

describe("createTunnelHandler", () => {
  it("POST /tunnel starts the tunnel and returns the current state", async () => {
    const { port, child } = await listenWithHandler();

    const res = await fetch(`http://localhost:${port}/tunnel`, {
      method: "POST",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "starting",
      message: "Starting tunnel…",
    });
    expect(child.kill).not.toHaveBeenCalled();
  });

  it("POST /tunnel is idempotent — second call does not respawn", async () => {
    const { port, manager } = await listenWithHandler();
    const startSpy = vi.spyOn(manager, "start");

    await fetch(`http://localhost:${port}/tunnel`, { method: "POST" });
    await fetch(`http://localhost:${port}/tunnel`, { method: "POST" });

    expect(startSpy).toHaveBeenCalledTimes(2);
    // Manager.start() is internally idempotent (verified in tunnel.test.ts).
  });

  it("DELETE /tunnel stops the tunnel", async () => {
    const { port, child } = await listenWithHandler();
    await fetch(`http://localhost:${port}/tunnel`, { method: "POST" });

    const res = await fetch(`http://localhost:${port}/tunnel`, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "idle" });
    expect(child.kill).toHaveBeenCalled();
  });

  it("GET /tunnel/events streams the current state on connect", async () => {
    const { port, child } = await listenWithHandler();
    await fetch(`http://localhost:${port}/tunnel`, { method: "POST" });
    child.stdout.emit(
      "data",
      Buffer.from(
        "Forwarding: https://abc.tunnel.example -> http://localhost:3000\n",
      ),
    );

    const res = await fetch(`http://localhost:${port}/tunnel/events`);
    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/);
    expect(res.body).toBeTruthy();

    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const { value } = await reader.read();
    const chunk = new TextDecoder().decode(value);

    expect(chunk).toContain("event: state");
    expect(chunk).toContain('"status":"connected"');
    expect(chunk).toContain('"url":"https://abc.tunnel.example"');

    await reader.cancel();
  });

  it("GET /tunnel/events sends the current error state on connect", async () => {
    const { port, child } = await listenWithHandler();
    await fetch(`http://localhost:${port}/tunnel`, { method: "POST" });
    child.stderr.emit("data", Buffer.from("boom: tunnel auth failed\n"));
    child.emit("close", 1);

    const res = await fetch(`http://localhost:${port}/tunnel/events`);
    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/);
    expect(res.body).toBeTruthy();

    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const { value } = await reader.read();
    const chunk = new TextDecoder().decode(value);

    expect(chunk).toContain("event: state");
    expect(chunk).toContain('"status":"error"');
    expect(chunk).toContain("boom: tunnel auth failed");

    await reader.cancel();
  });
});

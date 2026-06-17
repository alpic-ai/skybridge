import { EventEmitter } from "node:events";
import http from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type TunnelHandle, TunnelManager } from "./tunnel.js";
import { createTunnelHandler } from "./tunnel-handler.js";

let openServer: http.Server | undefined;
afterEach(() => openServer?.close());

function makeFakeHandle(url = "https://abc.tunnel.example") {
  const emitter = new EventEmitter();
  const handle: TunnelHandle = {
    url,
    on: (event, listener) => emitter.on(event, listener as () => void),
    close: vi.fn(),
  };
  return { handle, emitter };
}

async function listen(handler: http.RequestListener) {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as { port: number }).port;
  return { port, server };
}

async function listenWithHandler() {
  const { handle, emitter } = makeFakeHandle();
  const manager = new TunnelManager({
    getPort: () => 3000,
    openTunnel: () => Promise.resolve(handle),
  });
  const { port, server } = await listen(createTunnelHandler(manager));
  openServer = server;
  return { port, emitter, handle, manager };
}

describe("createTunnelHandler", () => {
  it("POST /__skybridge/tunnel starts the tunnel and returns the current state", async () => {
    const { port, handle } = await listenWithHandler();

    const res = await fetch(`http://localhost:${port}/__skybridge/tunnel`, {
      method: "POST",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "starting",
      message: "Starting tunnel…",
    });
    expect(handle.close).not.toHaveBeenCalled();
  });

  it("POST /__skybridge/tunnel is idempotent — second call does not respawn", async () => {
    const { port, manager } = await listenWithHandler();
    const startSpy = vi.spyOn(manager, "start");

    await fetch(`http://localhost:${port}/__skybridge/tunnel`, {
      method: "POST",
    });
    await fetch(`http://localhost:${port}/__skybridge/tunnel`, {
      method: "POST",
    });

    expect(startSpy).toHaveBeenCalledTimes(2);
    // Manager.start() is internally idempotent (verified in tunnel.test.ts).
  });

  it("DELETE /__skybridge/tunnel stops the tunnel", async () => {
    const { port, handle, manager } = await listenWithHandler();
    await fetch(`http://localhost:${port}/__skybridge/tunnel`, {
      method: "POST",
    });
    // Wait for connected (openTunnel resolves immediately via microtask)
    await vi.waitFor(() => expect(manager.getState().status).toBe("connected"));

    const res = await fetch(`http://localhost:${port}/__skybridge/tunnel`, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "idle" });
    expect(handle.close).toHaveBeenCalled();
  });

  it("GET /__skybridge/tunnel/events streams the current state on connect", async () => {
    const { port, manager } = await listenWithHandler();
    await fetch(`http://localhost:${port}/__skybridge/tunnel`, {
      method: "POST",
    });
    // Wait for connected
    await vi.waitFor(() => expect(manager.getState().status).toBe("connected"));

    const res = await fetch(
      `http://localhost:${port}/__skybridge/tunnel/events`,
    );
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

  it("GET /__skybridge/tunnel/events sends the current error state on connect", async () => {
    // Use a handle that errors on the "error" event after connecting
    const { handle, emitter } = makeFakeHandle();
    const manager = new TunnelManager({
      getPort: () => 3000,
      openTunnel: () => Promise.resolve(handle),
    });
    const { port, server } = await listen(createTunnelHandler(manager));
    openServer = server;

    await fetch(`http://localhost:${port}/__skybridge/tunnel`, {
      method: "POST",
    });
    // Wait for connected then emit an error activity
    await vi.waitFor(() => expect(manager.getState().status).toBe("connected"));
    emitter.emit("error", new Error("boom: tunnel auth failed"));

    const res = await fetch(
      `http://localhost:${port}/__skybridge/tunnel/events`,
    );
    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/);
    expect(res.body).toBeTruthy();

    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const { value } = await reader.read();
    const chunk = new TextDecoder().decode(value);

    expect(chunk).toContain("event: state");
    expect(chunk).toContain('"status":"connected"');

    await reader.cancel();
  });
});

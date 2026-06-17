import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import {
  type TunnelActivity,
  type TunnelHandle,
  TunnelManager,
} from "./tunnel.js";

function fakeHandle(url = "https://abc.tunnel.alpic.ai") {
  const emitter = new EventEmitter();
  const handle: TunnelHandle = {
    url,
    on: (event, listener) => emitter.on(event, listener as () => void),
    close: vi.fn(),
  };
  return { handle, emitter };
}

describe("TunnelManager", () => {
  it("transitions to connected with the tunnel url", async () => {
    const { handle } = fakeHandle();
    const openTunnel = vi.fn().mockResolvedValue(handle);
    const manager = new TunnelManager({ getPort: () => 3000, openTunnel });

    const states: string[] = [];
    manager.subscribe((s) => states.push(s.status));
    manager.start();
    await vi.waitFor(() =>
      expect(manager.getState()).toEqual({
        status: "connected",
        url: "https://abc.tunnel.alpic.ai",
      }),
    );
    expect(states).toContain("starting");
    expect(openTunnel).toHaveBeenCalledWith(3000);
  });

  it("goes to error when open() rejects", async () => {
    const openTunnel = vi.fn().mockRejectedValue(new Error("boom"));
    const manager = new TunnelManager({ getPort: () => 3000, openTunnel });
    manager.start();
    await vi.waitFor(() =>
      expect(manager.getState()).toEqual({ status: "error", message: "boom" }),
    );
  });

  it("emits activity for tunnel requests", async () => {
    const { handle, emitter } = fakeHandle();
    const manager = new TunnelManager({
      getPort: () => 3000,
      openTunnel: () => Promise.resolve(handle),
    });
    const activities: string[] = [];
    manager.on("activity", (a) => activities.push(a.text));
    manager.start();
    await vi.waitFor(() => expect(manager.getState().status).toBe("connected"));
    emitter.emit("request", { method: "GET", path: "/health" });
    expect(activities).toContain("GET /health");
  });

  it("closes the handle and returns to idle on stop", async () => {
    const { handle } = fakeHandle();
    const manager = new TunnelManager({
      getPort: () => 3000,
      openTunnel: () => Promise.resolve(handle),
    });
    manager.start();
    await vi.waitFor(() => expect(manager.getState().status).toBe("connected"));
    manager.stop();
    expect(handle.close).toHaveBeenCalled();
    expect(manager.getState()).toEqual({ status: "idle" });
  });

  it("emits an error-level activity when the tunnel errors", async () => {
    const { handle, emitter } = fakeHandle();
    const manager = new TunnelManager({
      getPort: () => 3000,
      openTunnel: () => Promise.resolve(handle),
    });
    const activities: TunnelActivity[] = [];
    manager.on("activity", (a: TunnelActivity) => activities.push(a));
    manager.start();
    await vi.waitFor(() => expect(manager.getState().status).toBe("connected"));
    emitter.emit("error", new Error("tunnel auth failed"));
    expect(activities).toContainEqual(
      expect.objectContaining({ text: "tunnel auth failed", level: "error" }),
    );
  });

  it("returns to idle when the tunnel closes on its own", async () => {
    const { handle, emitter } = fakeHandle();
    const manager = new TunnelManager({
      getPort: () => 3000,
      openTunnel: () => Promise.resolve(handle),
    });
    manager.start();
    await vi.waitFor(() => expect(manager.getState().status).toBe("connected"));
    emitter.emit("close");
    expect(manager.getState()).toEqual({ status: "idle" });
  });
});

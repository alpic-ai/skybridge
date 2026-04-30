import { afterEach, describe, expect, it } from "vitest";
import { startTunnelControlServer } from "./tunnel-control-server.js";

let openControl: { close: () => Promise<void> } | undefined;
afterEach(async () => {
  await openControl?.close();
  openControl = undefined;
});

describe("startTunnelControlServer", () => {
  it("listens on a random loopback port and serves /tunnel/events", async () => {
    const control = await startTunnelControlServer(() => 3000);
    openControl = control;

    expect(control.port).toBeGreaterThan(0);

    const res = await fetch(`http://127.0.0.1:${control.port}/tunnel/events`);
    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/);

    const reader = (res.body as ReadableStream<Uint8Array>).getReader();
    const { value } = await reader.read();
    const chunk = new TextDecoder().decode(value);
    expect(chunk).toContain("event: state");
    expect(chunk).toContain('"status":"idle"');
    await reader.cancel();
  });

  it("two concurrent control servers get different ports", async () => {
    const a = await startTunnelControlServer(() => 3000);
    const b = await startTunnelControlServer(() => 4000);
    try {
      expect(a.port).not.toBe(b.port);
    } finally {
      await a.close();
      await b.close();
    }
  });

  it("close() shuts the listener", async () => {
    const control = await startTunnelControlServer(() => 3000);
    await control.close();
    await expect(
      fetch(`http://127.0.0.1:${control.port}/tunnel/events`),
    ).rejects.toThrow();
  });
});

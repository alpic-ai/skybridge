import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseStdoutLine, TunnelManager, type TunnelState } from "./tunnel.js";

describe("parseStdoutLine", () => {
  it("returns a connected event when the forwarding line is seen", () => {
    const result = parseStdoutLine(
      "Forwarding: https://abc.tunnel.example -> http://localhost:3000",
    );
    expect(result).toEqual({
      kind: "connected",
      url: "https://abc.tunnel.example",
    });
  });

  it("strips a trailing slash from the forwarded URL", () => {
    const result = parseStdoutLine(
      "Forwarding: https://abc.tunnel.example/ -> http://localhost:3000",
    );
    expect(result).toEqual({
      kind: "connected",
      url: "https://abc.tunnel.example",
    });
  });

  it("returns a starting event for any other non-empty line", () => {
    expect(parseStdoutLine("Opening tunnel...")).toEqual({
      kind: "starting",
      message: "Opening tunnel...",
    });
  });

  it("returns null for empty lines", () => {
    expect(parseStdoutLine("")).toBeNull();
    expect(parseStdoutLine("   ")).toBeNull();
  });
});

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

describe("TunnelManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts idle", () => {
    const manager = new TunnelManager({
      getPort: () => 3000,
      spawn: () => makeFakeChild(),
    });
    expect(manager.getState()).toEqual({ status: "idle" });
  });

  it("transitions idle -> starting -> connected as stdout reports progress", () => {
    const child = makeFakeChild();
    const manager = new TunnelManager({
      getPort: () => 3000,
      spawn: () => child,
    });
    const states: string[] = [];
    manager.on("state", (s: TunnelState) => states.push(s.status));

    manager.start();
    child.stdout.emit("data", Buffer.from("Opening tunnel...\n"));
    child.stdout.emit(
      "data",
      Buffer.from(
        "Forwarding: https://abc.tunnel.example -> http://localhost:3000\n",
      ),
    );

    expect(states).toEqual(["starting", "starting", "connected"]);
    expect(manager.getState()).toEqual({
      status: "connected",
      url: "https://abc.tunnel.example",
    });
  });

  it("emits activity events for stdout lines after connect", () => {
    const child = makeFakeChild();
    const manager = new TunnelManager({
      getPort: () => 3000,
      spawn: () => child,
    });
    const activity: Array<{ text: string; level: string }> = [];
    manager.on("activity", (a: { text: string; level: string }) =>
      activity.push({ text: a.text, level: a.level }),
    );

    manager.start();
    child.stdout.emit(
      "data",
      Buffer.from(
        "Forwarding: https://abc.tunnel.example -> http://localhost:3000\n",
      ),
    );
    child.stdout.emit("data", Buffer.from("GET /widgets/foo\n"));
    child.stderr.emit("data", Buffer.from("connection wobble\n"));

    expect(activity).toEqual([
      { text: "GET /widgets/foo", level: "log" },
      { text: "connection wobble", level: "error" },
    ]);
  });

  it("calling start twice does not spawn twice", () => {
    const spawn = vi.fn(() => makeFakeChild());
    const manager = new TunnelManager({ getPort: () => 3000, spawn });
    manager.start();
    manager.start();
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it("transitions to error when the connection times out", () => {
    const child = makeFakeChild();
    const manager = new TunnelManager({
      getPort: () => 3000,
      spawn: () => child,
    });
    manager.start();

    vi.advanceTimersByTime(60_000);

    expect(manager.getState().status).toBe("error");
    expect(child.kill).toHaveBeenCalled();
  });

  it("preserves the timeout error message when the killed child later emits close", () => {
    const child = makeFakeChild();
    const manager = new TunnelManager({
      getPort: () => 3000,
      spawn: () => child,
    });
    manager.start();

    vi.advanceTimersByTime(60_000);
    // The killed child emits a non-zero close after the timeout fired.
    child.emit("close", 1);

    expect(manager.getState()).toEqual({
      status: "error",
      message: "Tunnel connection timed out after one minute",
    });
  });

  it("stop() kills the subprocess and goes idle", () => {
    const child = makeFakeChild();
    const manager = new TunnelManager({
      getPort: () => 3000,
      spawn: () => child,
    });
    manager.start();
    manager.stop();
    expect(child.kill).toHaveBeenCalled();
    expect(manager.getState()).toEqual({ status: "idle" });
  });

  it("subscribers get the current state on subscribe", () => {
    const child = makeFakeChild();
    const manager = new TunnelManager({
      getPort: () => 3000,
      spawn: () => child,
    });
    manager.start();
    child.stdout.emit(
      "data",
      Buffer.from(
        "Forwarding: https://abc.tunnel.example -> http://localhost:3000\n",
      ),
    );

    let received: TunnelState | undefined;
    const unsubscribe = manager.subscribe((s) => {
      received = s;
    });
    expect(received).toEqual({
      status: "connected",
      url: "https://abc.tunnel.example",
    });
    unsubscribe();
  });

  it("ignores deferred close from a child that was replaced via stop()+start()", () => {
    const childA = makeFakeChild();
    const childB = makeFakeChild();
    let spawnCount = 0;
    const manager = new TunnelManager({
      getPort: () => 3000,
      spawn: () => (spawnCount++ === 0 ? childA : childB),
    });

    manager.start();
    manager.stop();
    manager.start();
    childB.stdout.emit(
      "data",
      Buffer.from(
        "Forwarding: https://abc.tunnel.example -> http://localhost:3000\n",
      ),
    );
    expect(manager.getState()).toEqual({
      status: "connected",
      url: "https://abc.tunnel.example",
    });

    // Stale close from childA arrives only now — must not clobber state.
    childA.emit("close", null);
    expect(manager.getState()).toEqual({
      status: "connected",
      url: "https://abc.tunnel.example",
    });
  });

  it("ignores deferred error from a child that was replaced via stop()+start()", () => {
    const childA = makeFakeChild();
    const childB = makeFakeChild();
    let spawnCount = 0;
    const manager = new TunnelManager({
      getPort: () => 3000,
      spawn: () => (spawnCount++ === 0 ? childA : childB),
    });

    manager.start();
    manager.stop();
    manager.start();
    childB.stdout.emit(
      "data",
      Buffer.from(
        "Forwarding: https://abc.tunnel.example -> http://localhost:3000\n",
      ),
    );

    childA.emit("error", new Error("late spawn failure"));
    expect(manager.getState()).toEqual({
      status: "connected",
      url: "https://abc.tunnel.example",
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { busyPorts } = vi.hoisted(() => ({ busyPorts: new Set<number>() }));

vi.mock("node:net", () => {
  const createServer = () => {
    const handlers: Record<string, () => void> = {};
    const server = {
      once(event: string, cb: () => void) {
        handlers[event] = cb;
        return server;
      },
      listen(port: number) {
        queueMicrotask(() => {
          if (busyPorts.has(port)) {
            handlers.error?.();
          } else {
            handlers.listening?.();
          }
        });
        return server;
      },
      close(cb?: () => void) {
        cb?.();
        return server;
      },
    };
    return server;
  };
  return { default: { createServer } };
});

import { resolvePort } from "./detect-port.js";

const originalPort = process.env.PORT;

describe("resolvePort", () => {
  beforeEach(() => {
    busyPorts.clear();
    delete process.env.PORT;
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = originalPort;
    }
  });

  it("uses the --port flag as-is", async () => {
    await expect(resolvePort(4000)).resolves.toEqual({
      port: 4000,
      fallback: false,
    });
  });

  it("uses a valid PORT env var as-is", async () => {
    process.env.PORT = "5000";
    await expect(resolvePort()).resolves.toEqual({
      port: 5000,
      fallback: false,
    });
  });

  it("reports a fallback when the default port is taken", async () => {
    busyPorts.add(3000);
    await expect(resolvePort()).resolves.toEqual({
      port: 3001,
      fallback: true,
    });
  });

  it("warns and uses the default when PORT is invalid", async () => {
    process.env.PORT = "not-a-port";
    const result = await resolvePort();
    expect(result.port).toBe(3000);
    expect(result.fallback).toBe(false);
    expect(result.envWarning).toContain("not-a-port");
  });

  it("reports a fallback when PORT is invalid and the default is taken", async () => {
    // Regression: this branch hard-coded `fallback: false`, so the CLI printed
    // "Running on ..." instead of "3000 in use, running on ..." even though it
    // had moved off the default port.
    process.env.PORT = "not-a-port";
    busyPorts.add(3000);
    const result = await resolvePort();
    expect(result.port).toBe(3001);
    expect(result.fallback).toBe(true);
    expect(result.envWarning).toContain("not-a-port");
  });
});

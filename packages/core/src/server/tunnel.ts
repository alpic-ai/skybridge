import { spawn as nodeSpawn } from "node:child_process";
import { EventEmitter } from "node:events";
import type { Readable } from "node:stream";

export type TunnelState =
  | { status: "idle" }
  | { status: "starting"; message: string }
  | { status: "connected"; url: string }
  | { status: "error"; message: string };

export type ParsedStdoutEvent =
  | { kind: "connected"; url: string }
  | { kind: "starting"; message: string };

const FORWARDING_RE = /Forwarding:\s+(https?:\/\/\S+)\s*->\s*(\S+)/;

export function parseStdoutLine(line: string): ParsedStdoutEvent | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(FORWARDING_RE);
  if (match?.[1]) {
    return { kind: "connected", url: match[1].replace(/\/$/, "") };
  }
  return { kind: "starting", message: trimmed };
}

const CONNECT_TIMEOUT_MS = 60_000;
const STDERR_BUFFER_BYTES = 1024;

export type TunnelActivity = {
  time: string;
  text: string;
  level: "log" | "error";
};

export type TunnelChildProcess = {
  stdout: Pick<Readable, "on"> | null;
  stderr: Pick<Readable, "on"> | null;
  kill: (signal?: NodeJS.Signals | number) => boolean;
  on(event: "error", listener: (err: Error) => void): unknown;
  on(event: "close", listener: (code: number | null) => void): unknown;
};

type SpawnFn = (port: number) => TunnelChildProcess;

const defaultSpawn: SpawnFn = (port) =>
  nodeSpawn(
    "npx",
    ["--yes", "alpic", "tunnel", "--port", String(port), "--plain"],
    {
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

export class TunnelManager extends EventEmitter {
  private state: TunnelState = { status: "idle" };
  private child: ReturnType<SpawnFn> | null = null;
  private timeout: NodeJS.Timeout | null = null;
  private stderrBuffer = "";
  private connected = false;
  private readonly getPort: () => number;
  private readonly spawnFn: SpawnFn;

  constructor(opts: { getPort: () => number; spawn?: SpawnFn }) {
    super();
    this.getPort = opts.getPort;
    this.spawnFn = opts.spawn ?? defaultSpawn;
    // Multiple SSE subscribers (CLI, devtools, ad-hoc curl) can each register
    // state + activity listeners; the default cap of 10 is easy to hit.
    this.setMaxListeners(0);
  }

  getState(): TunnelState {
    return this.state;
  }

  subscribe(listener: (state: TunnelState) => void): () => void {
    listener(this.state);
    this.on("state", listener);
    return () => {
      this.off("state", listener);
    };
  }

  start(): void {
    if (this.state.status === "starting" || this.state.status === "connected") {
      return;
    }

    this.connected = false;
    this.stderrBuffer = "";
    this.setState({ status: "starting", message: "Starting tunnel…" });

    const child = this.spawnFn(this.getPort());
    this.child = child;

    this.timeout = setTimeout(() => {
      if (!this.connected) {
        this.setState({
          status: "error",
          message: "Tunnel connection timed out after one minute",
        });
        // Detach before killing so the imminent `close` event is treated as
        // stale and does not overwrite the timeout error message.
        this.child = null;
        child.kill();
      }
    }, CONNECT_TIMEOUT_MS);

    child.stdout?.on("data", (data: Buffer) => {
      this.handleStdout(data);
    });
    child.stderr?.on("data", (data: Buffer) => {
      this.handleStderr(data);
    });

    child.on("error", (err: Error) => {
      // Stale event from a child we've already replaced via stop()+start().
      if (child !== this.child) {
        return;
      }
      this.clearConnectTimeout();
      this.setState({ status: "error", message: err.message });
    });

    child.on("close", (code: number | null) => {
      // Stale event from a child we've already replaced via stop()+start().
      if (child !== this.child) {
        return;
      }
      this.clearConnectTimeout();
      if (code !== 0 && code !== null) {
        const detail = this.stderrBuffer.trim() || `exited with code ${code}`;
        this.setState({ status: "error", message: detail });
      } else {
        this.setState({ status: "idle" });
      }
      this.child = null;
    });
  }

  stop(): void {
    this.clearConnectTimeout();
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
    this.setState({ status: "idle" });
  }

  private handleStdout(data: Buffer): void {
    const lines = data.toString().split("\n");
    for (const raw of lines) {
      const parsed = parseStdoutLine(raw);
      if (!parsed) {
        continue;
      }
      if (parsed.kind === "connected") {
        this.connected = true;
        this.clearConnectTimeout();
        this.setState({ status: "connected", url: parsed.url });
      } else if (this.connected) {
        this.emitActivity(parsed.message, "log");
      } else {
        this.setState({ status: "starting", message: parsed.message });
      }
    }
  }

  private handleStderr(data: Buffer): void {
    const text = data.toString().trim();
    if (!text) {
      return;
    }
    this.stderrBuffer = (this.stderrBuffer + text).slice(-STDERR_BUFFER_BYTES);
    for (const line of text.split("\n").filter(Boolean)) {
      this.emitActivity(line, "error");
    }
  }

  private setState(next: TunnelState): void {
    this.state = next;
    this.emit("state", next);
  }

  private emitActivity(text: string, level: "log" | "error"): void {
    const activity: TunnelActivity = {
      time: new Date().toISOString(),
      text,
      level,
    };
    this.emit("activity", activity);
  }

  private clearConnectTimeout(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

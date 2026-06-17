import { EventEmitter } from "node:events";
// biome-ignore lint/correctness/noUndeclaredDependencies: dev-only symlink, intentionally not in package.json
import { AlpicClient } from "@alpic-ai/sdk";

export type TunnelState =
  | { status: "idle" }
  | { status: "starting"; message: string }
  | { status: "connected"; url: string }
  | { status: "error"; message: string };

export type TunnelActivity = {
  time: string;
  text: string;
  level: "log" | "error";
};

export type TunnelHandle = {
  readonly url: string;
  on(
    event: "request",
    listener: (req: { method: string; path: string }) => void,
  ): void;
  on(event: "error", listener: (err: Error) => void): void;
  on(event: "close", listener: () => void): void;
  close(): void;
};

export type OpenTunnelFn = (port: number) => Promise<TunnelHandle>;

const CONNECT_TIMEOUT_MS = 60_000;

const defaultOpenTunnel: OpenTunnelFn = (() => {
  let client: AlpicClient | null = null;
  return (port: number) => {
    client ??= new AlpicClient();
    return client.tunnel.open({
      port,
      autoLogin: true,
    });
  };
})();

export class TunnelManager extends EventEmitter {
  private state: TunnelState = { status: "idle" };
  private handle: TunnelHandle | null = null;
  private timeout: NodeJS.Timeout | null = null;
  private connecting = false;
  private readonly getPort: () => number;
  private readonly openTunnel: OpenTunnelFn;

  constructor(opts: { getPort: () => number; openTunnel?: OpenTunnelFn }) {
    super();
    this.getPort = opts.getPort;
    this.openTunnel = opts.openTunnel ?? defaultOpenTunnel;
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
    if (
      this.state.status === "starting" ||
      this.state.status === "connected" ||
      this.connecting
    ) {
      return;
    }

    this.connecting = true;
    this.setState({ status: "starting", message: "Starting tunnel…" });

    this.timeout = setTimeout(() => {
      if (this.connecting) {
        this.connecting = false;
        this.setState({
          status: "error",
          message: "Tunnel connection timed out after one minute",
        });
      }
    }, CONNECT_TIMEOUT_MS);

    this.openTunnel(this.getPort())
      .then((handle) => {
        if (!this.connecting) {
          handle.close();
          return;
        }
        this.connecting = false;
        this.clearConnectTimeout();
        this.handle = handle;
        this.setState({ status: "connected", url: handle.url });

        handle.on("request", (req) => {
          this.emitActivity(`${req.method} ${req.path}`, "log");
        });
        handle.on("error", (err) => {
          this.emitActivity(err.message, "error");
        });
        handle.on("close", () => {
          if (this.handle === handle) {
            this.handle = null;
            this.setState({ status: "idle" });
          }
        });
      })
      .catch((err: unknown) => {
        if (!this.connecting) {
          return;
        }
        this.connecting = false;
        this.clearConnectTimeout();
        this.setState({
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      });
  }

  stop(): void {
    this.connecting = false;
    this.clearConnectTimeout();
    if (this.handle) {
      this.handle.close();
      this.handle = null;
    }
    this.setState({ status: "idle" });
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

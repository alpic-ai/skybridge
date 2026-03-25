import { execFileSync } from "node:child_process";
import * as os from "node:os";
import * as pty from "node-pty";
import { type WebSocket, WebSocketServer } from "ws";

export interface ClaudeSessionServerOptions {
  port?: number;
  cwd?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  mcpUrl?: string;
  devtoolsMcpUrl?: string;
}

export interface ClaudeSessionServer {
  port: number;
  close(): void;
  cleanup(): void;
}

type ClientMessage =
  | { type: "input"; data: string }
  | { type: "resize"; cols: number; rows: number }
  | { type: "restart" };

type ServerMessage =
  | { type: "output"; data: string }
  | { type: "exit"; code: number | null }
  | { type: "started"; pid: number };

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function buildEnv(extra: Record<string, string>): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) {
      env[k] = v;
    }
  }
  return { ...env, ...extra, TERM: "xterm-256color" };
}

/** Resolve the full path of a command using the user's login shell. */
function resolveCommandPath(command: string): string {
  // If already an absolute path, use as-is
  if (command.startsWith("/")) {
    return command;
  }

  const isWindows = os.platform() === "win32";
  if (isWindows) {
    return command;
  }

  try {
    const shell = process.env.SHELL || "/bin/bash";
    // Pass command as a positional argument ($1) to avoid shell injection
    const result = execFileSync(
      shell,
      ["--login", "-c", 'which "$1"', "--", command],
      {
        encoding: "utf-8",
        timeout: 5000,
      },
    ).trim();
    if (result) {
      return result;
    }
  } catch {
    // fall through to returning the bare command name
  }

  return command;
}

/** Check whether an MCP entry already exists with this name and URL in the project scope. */
function mcpEntryExists(
  commandPath: string,
  name: string,
  mcpUrl: string,
  cwd: string,
): boolean {
  try {
    const output = execFileSync(commandPath, ["mcp", "list"], {
      encoding: "utf-8",
      timeout: 10000,
      cwd,
      env: buildEnv({}),
    });
    // Each line is roughly: "name  http  <url>"
    return output.includes(name) && output.includes(mcpUrl);
  } catch {
    return false;
  }
}

/** Register an MCP server with the Claude CLI at project scope (idempotent). */
function setupMcp(
  command: string,
  mcpUrl: string,
  name: string,
  cwd: string,
): void {
  const commandPath = resolveCommandPath(command);
  if (mcpEntryExists(commandPath, name, mcpUrl, cwd)) {
    return;
  }
  try {
    execFileSync(
      commandPath,
      ["mcp", "add", "--scope", "project", "--transport", "http", name, mcpUrl],
      {
        encoding: "utf-8",
        timeout: 10000,
        cwd,
        env: buildEnv({}),
      },
    );
  } catch {
    // ignore
  }
}

/** Remove an MCP server from the project-scoped Claude config. */
function removeMcp(command: string, name: string, cwd: string): void {
  const commandPath = resolveCommandPath(command);
  try {
    execFileSync(
      commandPath,
      ["mcp", "remove", "--scope", "project", name],
      {
        encoding: "utf-8",
        timeout: 10000,
        cwd,
        env: buildEnv({}),
      },
    );
  } catch {
    // ignore — entry may have already been removed
  }
}

function spawnProcess(
  ws: WebSocket,
  options: Required<
    Pick<ClaudeSessionServerOptions, "cwd" | "command" | "args" | "env">
  >,
): pty.IPty {
  const commandPath = resolveCommandPath(options.command);

  const proc = pty.spawn(commandPath, options.args, {
    name: "xterm-256color",
    cols: 80,
    rows: 24,
    cwd: options.cwd,
    env: buildEnv(options.env),
  });

  send(ws, { type: "started", pid: proc.pid });

  proc.onData((data) => {
    send(ws, { type: "output", data });
  });

  proc.onExit(({ exitCode }) => {
    send(ws, { type: "exit", code: exitCode });
  });

  return proc;
}

export function createClaudeSessionServer(
  options: ClaudeSessionServerOptions = {},
): ClaudeSessionServer {
  const port = options.port ?? 3001;
  const cwd = options.cwd ?? process.cwd();
  const command = options.command ?? "claude";
  const args = options.args ?? [];
  const env = options.env ?? {};
  const appHost = process.env.HOST ?? "localhost";
  const appPort = process.env.PORT ?? "3000";
  const mcpUrl = options.mcpUrl ?? `http://${appHost}:${appPort}/mcp`;
  const devtoolsMcpUrl = options.devtoolsMcpUrl;

  setupMcp(command, mcpUrl, "skybridge-app", cwd);
  if (devtoolsMcpUrl) {
    setupMcp(command, devtoolsMcpUrl, "skybridge-devtools", cwd);
  }

  const wss = new WebSocketServer({ port });

  wss.on("connection", (ws) => {
    let proc: pty.IPty | null = null;

    const resolvedOptions = { cwd, command, args, env };

    proc = spawnProcess(ws, resolvedOptions);

    ws.on("message", (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        return;
      }

      if (msg.type === "input") {
        proc?.write(msg.data);
      } else if (msg.type === "resize") {
        proc?.resize(msg.cols, msg.rows);
      } else if (msg.type === "restart") {
        try {
          proc?.kill("SIGTERM");
        } catch {
          // ignore if already dead
        }
        proc = spawnProcess(ws, resolvedOptions);
      }
    });

    ws.on("close", () => {
      try {
        proc?.kill("SIGTERM");
      } catch {
        // ignore
      }
      proc = null;
    });
  });

  return {
    port,
    close() {
      wss.close();
    },
    cleanup() {
      removeMcp(command, "skybridge-app", cwd);
      if (devtoolsMcpUrl) {
        removeMcp(command, "skybridge-devtools", cwd);
      }
    },
  };
}

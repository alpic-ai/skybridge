import { type ChildProcess, spawn } from "node:child_process";
import { resolve } from "node:path";

export interface RunningServer {
  url: string;
  /** Everything the server wrote to stdout/stderr, for failure reports. */
  output: () => string;
  stop: () => Promise<void>;
}

function hasExited(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null;
}

function isListeningMessage(
  message: unknown,
): message is { type: "skybridge:listening"; port: number } {
  return (
    typeof message === "object" &&
    message !== null &&
    (message as { type?: unknown }).type === "skybridge:listening" &&
    typeof (message as { port?: unknown }).port === "number"
  );
}

/**
 * Spawns the project's server with `__PORT=0` and an IPC channel, and waits
 * for the `skybridge:listening` message carrying the port the OS picked.
 * Binding and reporting both happen in the child, so there is no window in
 * which another process can steal the port.
 */
export async function startServer({
  cwd,
  command,
  env = {},
}: {
  cwd: string;
  command: string[];
  env?: Record<string, string>;
}): Promise<RunningServer> {
  const timeoutMs = 60_000;
  const [bin, ...args] = command;
  if (bin === undefined) {
    throw new Error("Empty server command");
  }

  const executable = bin.startsWith(".") ? resolve(cwd, bin) : bin;

  const child = spawn(executable, args, {
    cwd,
    env: {
      ...process.env,
      NODE_ENV: "production",
      ...env,
      __PORT: "0",
    },
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });

  let captured = "";
  const output = () => captured;
  child.stdout?.on("data", (chunk) => {
    captured += chunk;
  });
  child.stderr?.on("data", (chunk) => {
    captured += chunk;
  });

  const stop = async () => {
    if (hasExited(child)) {
      return;
    }
    const exited = new Promise<void>((resolveExit) => {
      child.once("exit", () => resolveExit());
    });
    child.kill("SIGTERM");
    const forced = setTimeout(() => child.kill("SIGKILL"), 3_000);
    await exited;
    clearTimeout(forced);
  };

  const port = await new Promise<number>((resolvePort, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `Server did not report a port in ${timeoutMs}ms. \`command\` must start the server process directly (node, tsx): wrappers such as \`pnpm run\` do not forward the IPC channel the readiness signal uses. It must also run a skybridge version that sends skybridge:listening.\n${output()}`,
        ),
      );
    }, timeoutMs);
    child.on("message", (message) => {
      if (isListeningMessage(message)) {
        clearTimeout(timer);
        resolvePort(message.port);
      }
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(
        new Error(`Failed to spawn ${command.join(" ")}: ${error.message}`),
      );
    });
    child.on("exit", () => {
      clearTimeout(timer);
      reject(
        new Error(
          `Server exited with code ${child.exitCode} before reporting its port:\n${output()}`,
        ),
      );
    });
  }).catch(async (error: unknown) => {
    await stop();
    throw error;
  });

  return { url: `http://127.0.0.1:${port}/mcp`, output, stop };
}

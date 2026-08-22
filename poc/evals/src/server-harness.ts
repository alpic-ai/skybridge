import { type ChildProcess, spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";

export interface RunningServer {
  url: string;
  /** Everything the server wrote to stdout/stderr, for failure reports. */
  output: () => string;
  stop: () => Promise<void>;
}

async function freePort(): Promise<number> {
  const probe = createServer();
  return new Promise<number>((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (address === null || typeof address === "string") {
        probe.close();
        reject(new Error("Could not read an ephemeral port"));
        return;
      }
      probe.close(() => resolve(address.port));
    });
  });
}

const INITIALIZE = JSON.stringify({
  jsonrpc: "2.0",
  id: 0,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "skybridge-eval-readiness", version: "0" },
  },
});

async function answersInitialize(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: INITIALIZE,
    });
    return response.ok;
  } catch {
    return false;
  }
}

function hasExited(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null;
}

async function waitUntilReady(
  url: string,
  child: ChildProcess,
  output: () => string,
  spawnError: () => Error | undefined,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const failure = spawnError();
    if (failure !== undefined) {
      throw failure;
    }
    if (hasExited(child)) {
      throw new Error(
        `Server exited with code ${child.exitCode} before answering initialize:\n${output()}`,
      );
    }
    if (await answersInitialize(url)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(
    `Server did not answer initialize in ${timeoutMs}ms:\n${output()}`,
  );
}

export async function startServer({
  cwd,
  command,
  env = {},
  timeoutMs = 60_000,
}: {
  cwd: string;
  command: string[];
  env?: Record<string, string>;
  timeoutMs?: number;
}): Promise<RunningServer> {
  const port = await freePort();
  const [bin, ...args] = command;
  if (bin === undefined) {
    throw new Error("Empty server command");
  }

  const executable = bin.startsWith(".") ? resolve(cwd, bin) : bin;

  const child = spawn(executable, args, {
    cwd,
    env: {
      ...process.env,
      ...env,
      NODE_ENV: "production",
      __PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let captured = "";
  const output = () => captured;
  let failure: Error | undefined;
  const spawnError = () => failure;
  child.on("error", (error) => {
    failure = new Error(
      `Failed to spawn ${command.join(" ")}: ${error.message}`,
    );
  });
  child.stdout?.on("data", (chunk) => {
    captured += chunk;
  });
  child.stderr?.on("data", (chunk) => {
    captured += chunk;
  });

  const url = `http://127.0.0.1:${port}/mcp`;
  const stop = async () => {
    if (hasExited(child)) {
      return;
    }
    const exited = new Promise<void>((resolve) => {
      if (hasExited(child)) {
        resolve();
        return;
      }
      child.once("exit", () => resolve());
    });
    child.kill("SIGTERM");
    const forced = setTimeout(() => child.kill("SIGKILL"), 3_000);
    await exited;
    clearTimeout(forced);
  };

  try {
    await waitUntilReady(url, child, output, spawnError, timeoutMs);
  } catch (error) {
    await stop();
    throw error;
  }

  return { url, output, stop };
}

import {
  type ChildProcessByStdio,
  execFileSync,
  spawn,
} from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import nodemonOriginal from "nodemon";
import { useEffect } from "react";
import type { ExtendedNodemon } from "./nodemon.d.ts";
import type { PushMessage } from "./use-messages.js";

const nodemon = nodemonOriginal as ExtendedNodemon;

const SOURCEMAP_WARNING = /^Sourcemap for ".*" points to missing source files$/;

function resolveCommand(command: string): string | null {
  try {
    return execFileSync("which", [command], { encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

interface Formatter {
  proc: ChildProcessByStdio<Writable, Readable, null>;
  alive: boolean;
}

function spawnFormatter(
  command: string,
  pushMessage: PushMessage,
): Formatter | null {
  const bin = resolveCommand(command);
  if (!bin) {
    pushMessage(
      `[format-logs] command not found: "${command}". Logs will not be formatted.`,
      "error",
    );
    return null;
  }
  try {
    const proc = spawn(bin, { stdio: ["pipe", "pipe", "ignore"] });
    const formatter: Formatter = { proc, alive: true };
    const rl = createInterface({ input: proc.stdout });

    rl.on("line", (line) => {
      pushMessage(line, "log");
    });

    // Prevent unhandled EPIPE crash if formatter exits while we write to stdin.
    proc.stdin.on("error", () => {});
    proc.on("error", () => {
      formatter.alive = false;
    });
    proc.on("close", () => {
      formatter.alive = false;
    });

    return formatter;
  } catch {
    return null;
  }
}

export function useNodemon(
  env: NodeJS.ProcessEnv,
  pushMessage: PushMessage,
  formatLogs?: string,
): void {
  useEffect(() => {
    const configFile = resolve(process.cwd(), "nodemon.json");

    const config = existsSync(configFile)
      ? {
          configFile,
        }
      : {
          watch: ["src"],
          ext: "ts,json",
          exec: "tsx src/server.ts",
        };

    nodemon({ ...config, env, stdout: false });

    const formatter = formatLogs
      ? spawnFormatter(formatLogs, pushMessage)
      : null;

    const handleStdoutData = (chunk: Buffer) => {
      const raw = chunk.toString().trim();
      if (!raw) {
        return;
      }
      const lines = raw.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }
        if (formatter?.alive) {
          formatter.proc.stdin.write(`${trimmed}\n`);
        } else {
          pushMessage(trimmed, "log");
        }
      }
    };

    const handleStderrData = (chunk: Buffer) => {
      const message = chunk.toString().trim();
      if (!message) {
        return;
      }
      // Node's source-map warnings for third-party deps (superjson, @mcp/sdk, …) — not actionable.
      const filtered = message
        .split("\n")
        .filter((line) => !SOURCEMAP_WARNING.test(line))
        .join("\n");
      if (filtered) {
        pushMessage(filtered, "error");
      }
    };

    const setupStdoutListener = () => {
      if (nodemon.stdout) {
        nodemon.stdout.off("data", handleStdoutData);
        nodemon.stdout.on("data", handleStdoutData);
      }
    };

    const setupStderrListener = () => {
      if (nodemon.stderr) {
        nodemon.stderr.off("data", handleStderrData);
        nodemon.stderr.on("data", handleStderrData);
      }
    };

    nodemon.on("readable", () => {
      setupStdoutListener();
      setupStderrListener();
    });

    nodemon.on("restart", (files: string[]) => {
      const restartMessage = `Server restarted due to file changes: ${files.join(", ")}`;
      pushMessage(restartMessage, "restart");
      setupStdoutListener();
      setupStderrListener();
    });

    return () => {
      if (nodemon.stdout) {
        nodemon.stdout.off("data", handleStdoutData);
      }
      if (nodemon.stderr) {
        nodemon.stderr.off("data", handleStderrData);
      }
      if (formatter?.alive) {
        formatter.proc.stdin.end();
        formatter.proc.kill();
      }
      nodemon.emit("quit");
    };
  }, [env, pushMessage, formatLogs]);
}

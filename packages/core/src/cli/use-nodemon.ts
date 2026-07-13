import { existsSync } from "node:fs";
import { resolve } from "node:path";
import nodemonOriginal from "nodemon";
import { useEffect } from "react";
import type { ExtendedNodemon } from "./nodemon.d.ts";
import type { PushMessage } from "./use-messages.js";

const nodemon = nodemonOriginal as ExtendedNodemon;

const SOURCEMAP_WARNING = /^Sourcemap for ".*" points to missing source files$/;

export interface NodemonHandlers {
  /** A raw chunk of server stdout, forwarded untouched. */
  onStdout: (chunk: Buffer) => void;
  /** A (filtered) chunk of server stderr. */
  onStderr: (message: string) => void;
  /** The server restarted because the listed files changed. */
  onRestart: (files: string[]) => void;
}

/**
 * Boot nodemon and wire its stdout/stderr to the provided handlers. Returns a
 * cleanup function that detaches the listeners and quits nodemon. Shared by the
 * Ink-based dev UI (via {@link useNodemon}) and the `--plain` runner.
 */
export function startNodemon(
  env: NodeJS.ProcessEnv,
  handlers: NodemonHandlers,
): () => void {
  const configFile = resolve(process.cwd(), "nodemon.json");

  const config = existsSync(configFile)
    ? {
        configFile,
      }
    : {
        watch: ["src"],
        ext: "ts,json,md",
        exec: "tsx src/server.ts",
      };

  nodemon({ ...config, env, stdout: false });

  const handleStdoutData = (chunk: Buffer) => {
    handlers.onStdout(chunk);
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
      handlers.onStderr(filtered);
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
    handlers.onRestart(files);
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
    nodemon.emit("quit");
  };
}

export function useNodemon(
  env: NodeJS.ProcessEnv,
  pushMessage: PushMessage,
): void {
  useEffect(
    () =>
      startNodemon(env, {
        onStdout: (chunk) => {
          const message = chunk.toString().trim();
          if (message) {
            pushMessage(message, "log");
          }
        },
        onStderr: (message) => pushMessage(message, "error"),
        onRestart: (files) =>
          pushMessage(
            `Server restarted due to file changes: ${files.join(", ")}`,
            "restart",
          ),
      }),
    [env, pushMessage],
  );
}

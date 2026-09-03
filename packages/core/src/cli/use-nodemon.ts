import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { useEffect, useState } from "react";
import type { ExtendedNodemon } from "./nodemon.d.ts";
import type { PushMessage } from "./use-messages.js";

function loadNodemon(): ExtendedNodemon {
  try {
    return createRequire(import.meta.url)("nodemon") as ExtendedNodemon;
  } catch {
    throw new Error(
      'skybridge dev needs the "nodemon" peer dependency. Install it with `npm install -D nodemon`.',
    );
  }
}

export const CRASH_MESSAGE =
  "💥  Server crashed. Fix the error, then save a file under src/ to restart it.";

const SOURCEMAP_WARNING = /^Sourcemap for ".*" points to missing source files$/;

export interface NodemonHandlers {
  /** A raw chunk of server stdout, forwarded untouched. */
  onStdout: (chunk: Buffer) => void;
  /** A (filtered) chunk of server stderr. */
  onStderr: (message: string) => void;
  /** The server restarted because the listed files changed. */
  onRestart: (files: string[]) => void;
  /**
   * The server exited with a non-zero code. nodemon does not restart it on its
   * own: it waits for the next file change.
   */
  onCrash: () => void;
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
  const nodemon = loadNodemon();
  const configFile = resolve(process.cwd(), "nodemon.json");

  const config = existsSync(configFile)
    ? {
        configFile,
      }
    : {
        watch: ["src"],
        ext: "ts,json,md",
        exec: "tsx src/index.ts",
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

  const reattachListeners = () => {
    setupStdoutListener();
    setupStderrListener();
  };

  nodemon.on("readable", reattachListeners);

  nodemon.on("crash", () => {
    handlers.onCrash();
  });

  nodemon.on("restart", (files: string[]) => {
    handlers.onRestart(files);
    reattachListeners();
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

/**
 * Boot nodemon for the Ink dev UI. Returns whether the server is currently
 * down after a crash, so the UI can stop advertising a URL nothing listens on.
 */
export function useNodemon(
  env: NodeJS.ProcessEnv,
  pushMessage: PushMessage,
): boolean {
  const [crashed, setCrashed] = useState(false);

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
        onRestart: (files) => {
          setCrashed(false);
          pushMessage(
            `Server restarted due to file changes: ${files.join(", ")}`,
            "restart",
          );
        },
        onCrash: () => setCrashed(true),
      }),
    [env, pushMessage],
  );

  return crashed;
}

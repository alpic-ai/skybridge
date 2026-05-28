import { existsSync } from "node:fs";
import { resolve } from "node:path";
import nodemonOriginal from "nodemon";
import { useEffect } from "react";
import type { ExtendedNodemon } from "./nodemon.d.ts";
import type { PushMessage } from "./use-messages.js";

const nodemon = nodemonOriginal as ExtendedNodemon;

const SOURCEMAP_WARNING = /^Sourcemap for ".*" points to missing source files$/;

export function useNodemon(
  env: NodeJS.ProcessEnv,
  pushMessage: PushMessage,
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

    const handleStdoutData = (chunk: Buffer) => {
      const message = chunk.toString().trim();
      if (message) {
        pushMessage(message, "log");
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
      nodemon.emit("quit");
    };
  }, [env, pushMessage]);
}

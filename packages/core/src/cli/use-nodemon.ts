import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nodemonOriginal from "nodemon";
import { useEffect, useState } from "react";
import type { ExtendedNodemon } from "./nodemon.d.ts";

const nodemon = nodemonOriginal as ExtendedNodemon;

type Message = {
  text: string;
  type: "log" | "restart" | "error";
};

export function useNodemon(env: NodeJS.ProcessEnv): Array<Message> {
  const [messages, setMessages] = useState<Array<Message>>([]);

  useEffect(() => {
    // Get the path to the server entry point (always use compiled .js file)
    const currentFile = fileURLToPath(import.meta.url);
    const cliDir = resolve(currentFile, "..");
    const entryPath = resolve(cliDir, "server-entry.js");

    // Start nodemon with the entry point that dynamically imports server.ts
    nodemon({
      env,
      watch: ["server/src"],
      ext: "ts,json",
      exec: `tsx ${entryPath}`,
      stdout: false,
      stderr: false,
    } as Parameters<typeof nodemon>[0]);

    const handleStdoutData = (chunk: Buffer) => {
      const message = chunk.toString().trim();
      if (message) {
        setMessages((prev) => [...prev, { text: message, type: "log" }]);
      }
    };

    const handleStderrData = (chunk: Buffer) => {
      const message = chunk.toString().trim();
      if (message) {
        setMessages((prev) => [...prev, { text: message, type: "error" }]);
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
      setMessages((prev) => [
        ...prev,
        { text: restartMessage, type: "restart" },
      ]);
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
  }, [env]);

  return messages;
}

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { useEffect, useState } from "react";
import type { Message } from "./types.js";

type TunnelState = {
  label: string;
  labelColor: "yellow" | "white" | "red";
  logs: Message[];
};

export function useTunnel(port: number | null): TunnelState {
  const [label, setLabel] = useState<{
    text: string;
    color: "yellow" | "white" | "red";
  }>({
    text: "Starting...",
    color: "yellow",
  });
  const [logs, setLogs] = useState<Message[]>([]);

  useEffect(() => {
    if (port === null) {
      return;
    }

    const tunnelProcess = spawn(
      "npx",
      ["--yes", "alpic", "tunnel", "--port", String(port), "--plain"],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stderrBuffer = "";
    let connected = false;

    const timeout = setTimeout(() => {
      if (!connected) {
        setLabel({
          text: "Tunnel connection timed out after one minute",
          color: "red",
        });
        tunnelProcess.kill();
      }
    }, 60_000);

    const pushLog = (text: string, type: "log" | "error") => {
      const time = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      setLogs((prev) =>
        [
          ...prev,
          {
            id: randomUUID(),
            text: `${time} [tunnel] ${text}`,
            type,
          },
        ].slice(-10),
      );
    };

    const handleStdout = (data: Buffer) => {
      const lines = data.toString().trim().split("\n").filter(Boolean);
      for (const line of lines) {
        if (connected) {
          pushLog(line, "log");
        } else {
          const match = line.match(
            /Forwarding:\s+(https:\/\/\S+)\s*->\s*(\S+)/,
          );
          if (match?.[1]) {
            connected = true;
            clearTimeout(timeout);
            setLabel({ text: line, color: "white" });
          } else {
            setLabel({ text: line, color: "yellow" });
          }
        }
      }
    };

    const handleStderr = (data: Buffer) => {
      const text = data.toString().trim();
      if (text) {
        stderrBuffer = (stderrBuffer + text).slice(-1024);
        for (const line of text.split("\n").filter(Boolean)) {
          if (connected) {
            pushLog(line, "error");
          }
        }
      }
    };

    if (tunnelProcess.stdout) {
      tunnelProcess.stdout.on("data", handleStdout);
    }
    if (tunnelProcess.stderr) {
      tunnelProcess.stderr.on("data", handleStderr);
    }

    tunnelProcess.on("error", (err) => {
      clearTimeout(timeout);
      setLabel({ text: err.message, color: "red" });
    });

    tunnelProcess.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0 && code !== null) {
        const detail = stderrBuffer.trim() || `exited with code ${code}`;
        setLabel({
          text: `${detail}. Try manually: npx alpic tunnel --port ${port}`,
          color: "red",
        });
      }
    });

    return () => {
      clearTimeout(timeout);
      tunnelProcess.kill();
    };
  }, [port]);

  return { label: label.text, labelColor: label.color, logs };
}

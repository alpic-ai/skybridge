import { spawn } from "node:child_process";
import { useEffect, useState } from "react";
import type { PushMessage } from "./use-messages.js";

type TunnelState = {
  label: string;
  labelColor: "yellow" | "white" | "red";
};

export function useTunnel(
  port: number | null,
  pushMessage: PushMessage,
  verbose: boolean,
): TunnelState {
  const [label, setLabel] = useState<{
    text: string;
    color: "yellow" | "white" | "red";
  }>({
    text: "Starting...",
    color: "yellow",
  });

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
      pushMessage(`${time} [tunnel] ${text}`, type);
    };

    const handleStdout = (data: Buffer) => {
      const lines = data.toString().trim().split("\n").filter(Boolean);
      for (const line of lines) {
        if (connected) {
          if (verbose) {
            pushLog(line, "log");
          }
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
        if (verbose) {
          for (const line of text.split("\n").filter(Boolean)) {
            if (connected) {
              pushLog(line, "error");
            }
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
        const hint = verbose
          ? `Try manually: npx alpic tunnel --port ${port}`
          : "Re-run with --verbose to see full tunnel logs";
        setLabel({
          text: `${detail}. ${hint}`,
          color: "red",
        });
      }
    });

    return () => {
      clearTimeout(timeout);
      tunnelProcess.kill();
    };
  }, [port, pushMessage, verbose]);

  return { label: label.text, labelColor: label.color };
}

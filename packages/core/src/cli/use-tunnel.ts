import { spawn } from "node:child_process";
import { useEffect, useState } from "react";
import type { PushMessage } from "./use-messages.js";

export type TunnelState =
  | { status: "idle" }
  | { status: "starting"; message: string }
  | { status: "connected"; url: string }
  | { status: "error"; message: string };

export function useTunnel(
  port: number | null,
  pushMessage: PushMessage,
  verbose: boolean,
): TunnelState {
  const [state, setState] = useState<TunnelState>(
    port === null
      ? { status: "idle" }
      : { status: "starting", message: "Starting tunnel…" },
  );

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
        setState({
          status: "error",
          message: "Tunnel connection timed out after one minute",
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
          continue;
        }
        const match = line.match(/Forwarding:\s+(https:\/\/\S+)\s*->\s*(\S+)/);
        if (match?.[1]) {
          connected = true;
          clearTimeout(timeout);
          const url = match[1].replace(/\/$/, "");
          setState({ status: "connected", url });
        } else {
          setState({ status: "starting", message: line });
        }
      }
    };

    const handleStderr = (data: Buffer) => {
      const text = data.toString().trim();
      if (!text) {
        return;
      }

      stderrBuffer = (stderrBuffer + text).slice(-1024);
      if (verbose && connected) {
        for (const line of text.split("\n").filter(Boolean)) {
          pushLog(line, "error");
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
      setState({ status: "error", message: err.message });
    });

    tunnelProcess.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0 && code !== null) {
        const detail = stderrBuffer.trim() || `exited with code ${code}`;
        const hint = verbose
          ? `Try manually: npx alpic tunnel --port ${port}`
          : "Re-run with --verbose to see full tunnel logs";
        setState({
          status: "error",
          message: `${detail}. ${hint}`,
        });
      }
    });

    return () => {
      clearTimeout(timeout);
      tunnelProcess.kill();
    };
  }, [port, pushMessage, verbose]);

  return state;
}

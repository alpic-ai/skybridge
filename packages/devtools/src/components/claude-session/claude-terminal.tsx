import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { Maximize2, Minimize2, RefreshCw, SquareTerminal, Unplug, Wifi } from "lucide-react";
import { useEffect, useRef } from "react";
import { useClaudeWs } from "@/lib/claude-ws.js";
import { cn } from "@/lib/utils.js";
import { Button } from "../ui/button.js";

const STATUS_COLORS: Record<string, string> = {
  idle: "bg-zinc-400",
  connecting: "bg-yellow-400 animate-pulse",
  connected: "bg-green-400",
  disconnected: "bg-zinc-500",
  error: "bg-red-500",
};

const STATUS_LABELS: Record<string, string> = {
  idle: "Idle",
  connecting: "Connecting…",
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Error",
};

interface ClaudeTerminalProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function ClaudeTerminal({ isFullscreen, onToggleFullscreen }: ClaudeTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const {
    status,
    pid,
    error,
    connect,
    disconnect,
    sendInput,
    sendResize,
    sendRestart,
    setOnData,
  } = useClaudeWs();

  // Initialize xterm once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: {
        background: "#0a0a0a",
        foreground: "#e4e4e7",
        cursor: "#a1a1aa",
        selectionBackground: "#3f3f46",
        black: "#18181b",
        red: "#f87171",
        green: "#4ade80",
        yellow: "#facc15",
        blue: "#60a5fa",
        magenta: "#c084fc",
        cyan: "#22d3ee",
        white: "#e4e4e7",
        brightBlack: "#3f3f46",
        brightRed: "#fca5a5",
        brightGreen: "#86efac",
        brightYellow: "#fde047",
        brightBlue: "#93c5fd",
        brightMagenta: "#d8b4fe",
        brightCyan: "#67e8f9",
        brightWhite: "#f4f4f5",
      },
      fontFamily: '"JetBrains Mono Variable", "JetBrains Mono", monospace',
      fontSize: 13,
      cursorBlink: true,
      allowTransparency: false,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    term.onData((data) => {
      sendInput(data);
    });

    setOnData((data) => {
      term.write(data);
    });

    const observer = new ResizeObserver(() => {
      fitAddon.fit();
      sendResize(term.cols, term.rows);
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sendInput, sendResize, setOnData]);

  // Auto-connect when idle
  useEffect(() => {
    if (status === "idle") {
      connect();
    }
  }, [status, connect]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <div className="flex items-center gap-2">
          <SquareTerminal className="h-4 w-4 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-300">Claude</span>
          {pid !== undefined && (
            <span className="text-xs text-zinc-500">pid {pid}</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {error && (
            <span className="text-xs text-red-400 max-w-48 truncate">
              {error}
            </span>
          )}

          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                STATUS_COLORS[status] ?? "bg-zinc-400",
              )}
            />
            <span className="text-xs text-zinc-400">
              {STATUS_LABELS[status] ?? status}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {(status === "disconnected" ||
              status === "error" ||
              status === "idle") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800"
                onClick={connect}
              >
                <Wifi className="h-3.5 w-3.5" />
                Reconnect
              </Button>
            )}

            {status === "connected" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800"
                onClick={() => {
                  termRef.current?.clear();
                  sendRestart();
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Restart
              </Button>
            )}

            {onToggleFullscreen && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800"
                onClick={onToggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Terminal */}
      <div className="flex-1 overflow-hidden p-2">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}

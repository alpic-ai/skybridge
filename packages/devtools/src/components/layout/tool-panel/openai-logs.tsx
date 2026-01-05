import { TrashIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button.js";
import { useSelectedTool } from "@/lib/mcp/index.js";
import { type OpenAiLog, useCallToolResult, useStore } from "@/lib/store.js";

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

function getArgsPreview(
  args: Record<string, unknown>,
  maxLength: number = 60,
): string {
  const str = JSON.stringify(args);
  return str.length > maxLength ? `${str.slice(0, maxLength)}…` : str;
}

function LogEntry({ log }: { log: OpenAiLog }) {
  const [expanded, setExpanded] = useState(false);
  const hasArgs = Object.keys(log.args).length > 0;
  const argsPreview = hasArgs ? getArgsPreview(log.args) : null;

  return (
    <>
      {hasArgs ? (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 py-1.5 px-2 text-xs font-mono border-b border-gray-200 dark:border-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/30 w-full text-left"
        >
          <span className="text-gray-600 dark:text-gray-500 shrink-0 min-w-[80px]">
            {formatTimestamp(log.timestamp)}
          </span>
          <span className="text-blue-600 dark:text-blue-400 font-semibold shrink-0 min-w-[120px]">
            {log.command}
          </span>
          <span className="text-gray-500 dark:text-gray-600 mr-1">
            {expanded ? "▼" : "▶"}
          </span>
          <span className="text-gray-600 dark:text-gray-400 truncate flex-1 min-w-0">
            {argsPreview}
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-2 py-1.5 px-2 text-xs font-mono border-b border-gray-200 dark:border-gray-800/50">
          <span className="text-gray-600 dark:text-gray-500 shrink-0 min-w-[80px]">
            {formatTimestamp(log.timestamp)}
          </span>
          <span className="text-blue-600 dark:text-blue-400 font-semibold shrink-0 min-w-[120px]">
            {log.command}
          </span>
        </div>
      )}
      {expanded && hasArgs && (
        <div className="px-2 py-2 bg-gray-50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-800/50">
          <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap overflow-x-auto">
            {JSON.stringify(log.args, null, 2)}
          </pre>
        </div>
      )}
    </>
  );
}

export function OpenAiLogs() {
  const tool = useSelectedTool();
  const { setToolData } = useStore();
  const { openaiLogs } = useCallToolResult(tool.name);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClearLogs = () => {
    setToolData(tool.name, {
      openaiLogs: [],
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden min-h-0">
      <div className="flex items-center justify-between mb-3 h-8 flex-none">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-200">
          OpenAI API Logs
        </h3>
        {openaiLogs.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearLogs}>
            <TrashIcon className="w-3 h-3" />
            Clear
          </Button>
        )}
      </div>
      <div
        ref={containerRef}
        className="overflow-auto flex-1 bg-gray-50 rounded-lg border border-gray-200 min-h-0"
      >
        {openaiLogs.map((log) => (
          <LogEntry key={log.id} log={log} />
        ))}
      </div>
    </div>
  );
}

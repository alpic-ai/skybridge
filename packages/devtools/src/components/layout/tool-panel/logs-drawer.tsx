import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Trash2, X } from "lucide-react";
import { useState } from "react";
import { CopyButton } from "@/lib/copy.js";
import { useSelectedToolOrNull } from "@/lib/mcp/index.js";
import { type OpenAiLog, useCallToolResult, useStore } from "@/lib/store.js";
import { cn } from "@/lib/utils.js";
import { JsonSyntaxBlock } from "./json-syntax-block.js";

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });

type Category = "req" | "res" | "view";

const getCategory = (log: OpenAiLog): Category => {
  if (log.source === "view") {
    return "view";
  }
  return log.type === "response" ? "res" : "req";
};

const LOG_ACCORDION_TRANSITION = {
  duration: 0.2,
  ease: [0.4, 0, 0.2, 1] as const,
};

const CATEGORY_STYLES: Record<
  Category,
  { label: string; badge: string; command: string }
> = {
  req: {
    label: "req",
    badge: "bg-sky-100 text-sky-700",
    command: "text-sky-600",
  },
  res: {
    label: "res",
    badge: "bg-emerald-100 text-emerald-700",
    command: "text-emerald-600",
  },
  view: {
    label: "view",
    badge: "bg-violet-100 text-violet-700",
    command: "text-violet-600",
  },
};

const LogEntry = ({
  log,
  expanded,
  onToggle,
}: {
  log: OpenAiLog;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const hasArgs = Object.keys(log.args).length > 0;
  const category = getCategory(log);
  const styles = CATEGORY_STYLES[category];

  return (
    <div>
      <button
        type="button"
        onClick={() => hasArgs && onToggle()}
        disabled={!hasArgs}
        className={cn(
          "flex w-full items-center gap-2 border-b border-border px-2 py-1.5 text-left font-mono text-xs bg-background",
          hasArgs ? "cursor-pointer hover:bg-light-gray" : "cursor-default",
        )}
      >
        <ChevronRight
          className={cn(
            "size-3 shrink-0 text-muted-foreground transition-transform duration-200 ease-in-out",
            !hasArgs && "invisible",
            expanded && "rotate-90",
          )}
        />
        <span className="min-w-[80px] shrink-0 text-muted-foreground">
          {formatTimestamp(log.timestamp)}
        </span>
        <span
          className={cn(
            "shrink-0 rounded px-1 text-[10px] font-medium uppercase tracking-wide",
            styles.badge,
          )}
        >
          {styles.label}
        </span>
        <span
          className={cn("min-w-[120px] shrink-0 font-semibold", styles.command)}
        >
          {log.command}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && hasArgs ? (
          <motion.div
            key="args"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={LOG_ACCORDION_TRANSITION}
            className="overflow-hidden border-b border-border bg-muted/40"
          >
            <div className="px-2 py-2">
              <div className="overflow-x-auto">
                <JsonSyntaxBlock code={JSON.stringify(log.args, null, 2)} />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export const LogsDrawer = ({ onClose }: { onClose?: () => void }) => {
  const tool = useSelectedToolOrNull();
  const data = useCallToolResult(tool?.name ?? "");
  const logs = data?.openaiLogs ?? [];
  const clearOpenAiLogs = useStore((s) => s.clearOpenAiLogs);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border-l-2 border-border bg-background">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-1">
          <h3 className="text-sm font-semibold text-foreground">Logs</h3>
          <button
            type="button"
            aria-label="Clear logs"
            onClick={() => tool && clearOpenAiLogs(tool.name)}
            disabled={logs.length === 0}
            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-light-gray hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
          >
            <Trash2 className="size-3.5" />
          </button>
          <CopyButton
            value={JSON.stringify(logs, null, 2)}
            label="Copy logs"
            className="inline-flex size-6 items-center justify-center rounded-md transition-colors hover:bg-light-gray focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        {onClose ? (
          <button
            type="button"
            aria-label="Close logs"
            onClick={onClose}
            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-light-gray hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-light-gray">
        {logs.map((log) => (
          <LogEntry
            key={log.id}
            log={log}
            expanded={expandedIds.has(log.id)}
            onToggle={() =>
              setExpandedIds((ids) => {
                const next = new Set(ids);
                if (next.has(log.id)) {
                  next.delete(log.id);
                } else {
                  next.add(log.id);
                }
                return next;
              })
            }
          />
        ))}
      </div>
    </div>
  );
};

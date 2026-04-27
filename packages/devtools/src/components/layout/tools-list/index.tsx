import { cn } from "@alpic-ai/ui/lib/cn";
import { ChevronsLeftRightIcon } from "lucide-react";
import { useEffect } from "react";
import { useSelectedToolOrNull, useSuspenseTools } from "@/lib/mcp/index.js";
import { useSelectedToolName } from "@/lib/nuqs.js";
import { SlidingIndicator, useSlidingIndicator } from "./sliding-indicator.js";

function ToolGlyph({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-[5px] transition-colors",
        selected
          ? "bg-primary text-primary-foreground"
          : "text-subtle-foreground",
      )}
      aria-hidden
    >
      <ChevronsLeftRightIcon className="size-3.5" />
    </span>
  );
}

function ToolsList() {
  const tools = useSuspenseTools();
  const [selectedToolName, setSelectedTool] = useSelectedToolName();
  const selectedTool = useSelectedToolOrNull();
  const { ref: listRef, state: indicatorState } = useSlidingIndicator(
    selectedTool?.name ?? null,
  );

  useEffect(() => {
    if (selectedToolName) {
      return;
    }
    const first = tools?.[0]?.name;
    if (first) {
      setSelectedTool(first);
    }
  }, [selectedToolName, tools, setSelectedTool]);

  return (
    <aside className="flex min-h-0 flex-col px-1 py-2.5">
      <header className="flex items-center justify-between px-4 pt-2 pb-3">
        <h2 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Tools
        </h2>
        <span className="text-[11px] tabular-nums text-subtle-foreground">
          {tools?.length ?? 0} {tools?.length === 1 ? "tool" : "tools"}
        </span>
      </header>

      <div
        ref={listRef}
        className="relative min-h-0 flex-1 overflow-y-auto px-2"
      >
        <SlidingIndicator state={indicatorState} />
        {tools?.length > 0 &&
          tools?.map((tool) => {
            const isSelected = tool.name === selectedTool?.name;
            return (
              <button
                key={tool.name}
                type="button"
                data-id={tool.name}
                onClick={() => setSelectedTool(tool.name)}
                className={cn(
                  "relative z-10 flex w-full items-start gap-2.5 rounded-md px-3 py-2.5 text-left transition-colors",
                  "focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none",
                  isSelected
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <ToolGlyph selected={isSelected} />
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "font-mono text-sm leading-5 font-semibold",
                      isSelected ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {tool.name}
                  </div>
                  {tool.description && (
                    <div className="mt-0.5 line-clamp-2 text-[11.5px] leading-[15px] text-subtle-foreground">
                      {tool.description}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
      </div>
    </aside>
  );
}

export default ToolsList;

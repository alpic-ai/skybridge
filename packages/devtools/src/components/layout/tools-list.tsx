import { useSelectedToolOrNull, useSuspenseTools } from "@/lib/mcp/index.js";
import { useSelectedToolName } from "@/lib/nuqs.js";
import { cn } from "@/lib/utils.js";

function ToolsList() {
  const tools = useSuspenseTools();
  const [, setSelectedTool] = useSelectedToolName();
  const selectedTool = useSelectedToolOrNull();

  return (
    <div className="h-full border-r border-border bg-card flex flex-col">
      <aside className="h-full flex flex-col">
        <div className="p-4 border-b border-border h-[72px] flex flex-col justify-center">
          <h2 className="text-sm font-semibold text-foreground mb-1">Tools</h2>
          <p className="text-xs text-muted-foreground">
            {tools?.length} {tools?.length === 1 ? "tool" : "tools"}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {tools?.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No tools registered yet.
              </div>
            ) : (
              <div className="space-y-1">
                {tools?.map((tool) => {
                  const isSelected = tool.name === selectedTool?.name;
                  return (
                    <button
                      key={tool.name}
                      type="button"
                      onClick={() => setSelectedTool(tool.name)}
                      className={cn(
                        "w-full text-left px-3 py-3 rounded-md transition-colors cursor-pointer relative",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
                        isSelected && "bg-accent text-accent-foreground",
                      )}
                    >
                      <div className="pr-6 flex flex-col gap-1">
                        <div
                          className={cn(
                            "font-semibold text-sm leading-tight truncate",
                            isSelected && "text-accent-foreground",
                          )}
                        >
                          {tool.name}
                        </div>
                        {tool.description && (
                          <div
                            className={cn(
                              "text-xs leading-snug text-muted-foreground",
                              "line-clamp-2",
                              isSelected && "text-accent-foreground/80",
                            )}
                          >
                            {tool.description}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

export default ToolsList;

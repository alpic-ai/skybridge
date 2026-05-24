import { Accordion } from "@alpic-ai/ui/components/accordion";
import { Button } from "@alpic-ai/ui/components/button";
import { useTimeout } from "ahooks";
import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSuspenseTools } from "@/lib/mcp/index.js";
import { useSelectedToolName } from "@/lib/nuqs.js";
import { queryClient } from "@/lib/query-client.js";
import { cn } from "@/lib/utils.js";
import { ToolItem } from "./tool-item.js";

function ToolsList() {
  const tools = useSuspenseTools();
  const [openTool, setOpenTool] = useSelectedToolName();
  const [refreshing, setRefreshing] = useState(false);
  const [tailDelay, setTailDelay] = useState<number | undefined>(undefined);

  useTimeout(() => {
    setRefreshing(false);
    setTailDelay(undefined);
  }, tailDelay);

  const didInit = useRef(false);
  useEffect(() => {
    if (!didInit.current && openTool == null && tools[0]) {
      didInit.current = true;
      setOpenTool(tools[0].name);
    }
  }, [openTool, tools, setOpenTool]);

  const refreshTools = async () => {
    setTailDelay(undefined);
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["list-tools"] });
    } finally {
      setTailDelay(600);
    }
  };

  const handleToolClick = (toolName: string) => {
    setOpenTool(toolName || null);
  };

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_1fr]">
      <header className="flex h-9 items-center justify-between border-b border-border  px-3 pr-0">
        <span className="text-sm font-medium">Tools</span>
        <Button
          onClick={refreshTools}
          aria-label="Refresh tools"
          variant="tertiary"
          size="icon"
        >
          <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
        </Button>
      </header>
      <Accordion
        type="single"
        collapsible
        value={openTool ?? ""}
        onValueChange={handleToolClick}
        className="min-h-0 overflow-y-auto"
      >
        {tools.map((tool) => (
          <ToolItem key={tool.name} tool={tool} open={openTool === tool.name} />
        ))}
      </Accordion>
    </div>
  );
}

export default ToolsList;

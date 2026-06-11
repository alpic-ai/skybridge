import { Accordion } from "@alpic-ai/ui/components/accordion";
import { Button } from "@alpic-ai/ui/components/button";
import { useTimeout } from "ahooks";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useSuspenseTools } from "@/lib/mcp/index.js";
import { queryClient } from "@/lib/query-client.js";
import { cn } from "@/lib/utils.js";
import { ToolItem } from "./tool-item.js";

function ToolsList() {
  const tools = useSuspenseTools();
  const [openTools, setOpenTools] = useState<string[]>(
    tools.map((tool) => tool.name),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [tailDelay, setTailDelay] = useState<number | undefined>(undefined);

  useTimeout(() => {
    setRefreshing(false);
    setTailDelay(undefined);
  }, tailDelay);

  const refreshTools = async () => {
    setTailDelay(undefined);
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["list-tools"] });
    } finally {
      setTailDelay(600);
    }
  };

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_1fr]">
      <header className="flex h-9 items-center justify-between border-b border-border pl-4 pr-0">
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
        type="multiple"
        value={openTools}
        onValueChange={setOpenTools}
        className="min-h-0 overflow-y-auto"
      >
        {tools.map((tool) => (
          <ToolItem key={tool.name} tool={tool} />
        ))}
      </Accordion>
    </div>
  );
}

export default ToolsList;

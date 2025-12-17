import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useResizablePanelSize } from "@/hooks/use-resizable-panel-size";
import { useSelectedTool } from "@/lib/mcp/index.js";
import { useCallToolResult } from "@/lib/store.js";
import { Suspense } from "react";
import { InputForm } from "./input-form.js";
import { OpenAiInspector } from "./openai-inspector.js";
import { OpenAiLogs } from "./openai-logs.js";
import { Output } from "./output.js";
import { Widget } from "./widget/widget.js";

export const ToolPanel = () => {
  const tool = useSelectedTool();
  const toolResult = useCallToolResult(tool.name);
  const inputColumnSize = useResizablePanelSize({
    key: "skybridge-devtools-input-column-width",
    defaultSizePercent: 35,
    minSizePercent: 20,
    maxSizePercent: 60,
  });

  const shouldDisplayWidgetSection = Boolean(
    tool._meta?.["ui/resourceUri"] &&
      toolResult?.response &&
      !toolResult.response.isError,
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative z-10">
      <ResizablePanelGroup
        direction="horizontal"
        className="flex flex-1 overflow-hidden border-b border-border"
        onLayout={(sizes) => {
          if (sizes[0] !== undefined) {
            inputColumnSize.onResize(sizes[0]);
          }
        }}
      >
        <ResizablePanel
          defaultSize={inputColumnSize.size}
          minSize={20}
          maxSize={60}
        >
          <div className="flex flex-col overflow-hidden h-full">
            <InputForm />
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={100 - inputColumnSize.size} minSize={30}>
          <div className="flex flex-col overflow-hidden h-full">
            <Output />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      {shouldDisplayWidgetSection && (
        <div className="flex overflow-hidden bg-card relative h-[60%]">
          <div className="flex flex-col flex-1 h-full overflow-hidden bg-card border-r border-border">
            <div className="border-b border-border">
              <Suspense>
                <Widget />
              </Suspense>
            </div>
            <div className="p-4 flex flex-col h-full min-h-0">
              <OpenAiLogs />
            </div>
          </div>

          <div className="flex flex-col overflow-hidden w-[400px] flex-none min-h-0">
            <div className="overflow-auto">
              <OpenAiInspector />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

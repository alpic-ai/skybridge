import { Suspense } from "react";
import { useSelectedTool } from "@/lib/mcp/index.js";
import { useCallToolResult } from "@/lib/store.js";
import { InputForm } from "./input-form.js";
import { OpenAiInspector } from "./openai-inspector.js";
import { OpenAiLogs } from "./openai-logs.js";
import { Output } from "./output.js";
import { Widget } from "./widget/widget.js";

export const ToolPanel = () => {
  const tool = useSelectedTool();
  const toolResult = useCallToolResult(tool.name);

  const shouldDisplayWidgetSection = Boolean(
    tool._meta?.["openai/outputTemplate"] &&
      toolResult?.response &&
      !toolResult.response.isError,
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative z-10 h-full">
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        <div className="grid flex-1 grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] overflow-hidden min-h-0">
          <div className="flex flex-col overflow-hidden h-full">
            <InputForm />
          </div>
          <div className="bg-border" />
          <div className="flex flex-col overflow-hidden h-full">
            <Output />
          </div>
        </div>
        {shouldDisplayWidgetSection && (
          <>
            <div className="h-px bg-border" />
            <div className="grid flex-1 grid-cols-[minmax(0,1fr)_1px_minmax(240px,30%)] overflow-hidden bg-card min-h-0">
              <div className="flex flex-col h-full overflow-hidden">
                <div className="grid flex-1 grid-rows-[minmax(0,1fr)_1px_minmax(0,1fr)] overflow-hidden min-h-0">
                  <div className="h-full overflow-hidden">
                    <Suspense>
                      <Widget />
                    </Suspense>
                  </div>
                  <div className="bg-border" />
                  <div className="p-4 flex flex-col h-full min-h-0">
                    <OpenAiLogs />
                  </div>
                </div>
              </div>
              <div className="bg-border" />
              <div className="flex flex-col overflow-hidden h-full min-h-0">
                <div className="overflow-auto">
                  <OpenAiInspector />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

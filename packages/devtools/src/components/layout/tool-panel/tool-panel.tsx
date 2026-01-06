import { Suspense } from "react";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
} from "react-resizable-panels";
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
  const { defaultLayout, onLayoutChange } = useDefaultLayout({
    id: "skybridge-devtools-input-column",
    storage: localStorage,
  });

  const shouldDisplayWidgetSection = Boolean(
    tool._meta?.["openai/outputTemplate"] &&
      toolResult?.response &&
      !toolResult.response.isError,
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative z-10">
      <Group
        orientation="horizontal"
        className="flex-1 overflow-hidden border-b border-border"
        defaultLayout={defaultLayout}
        onLayoutChange={onLayoutChange}
      >
        <Panel id="input-column" minSize="20" maxSize="60">
          <div className="flex flex-col overflow-hidden h-full">
            <InputForm />
          </div>
        </Panel>
        <Separator className="w-px bg-border" />
        <Panel id="output-column" minSize="30">
          <div className="flex flex-col overflow-hidden h-full">
            <Output />
          </div>
        </Panel>
      </Group>
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

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
  const { defaultLayout: widgetLayout, onLayoutChange: onWidgetLayoutChange } =
    useDefaultLayout({
      id: "skybridge-devtools-widget-section",
      storage: localStorage,
    });
  const {
    defaultLayout: inspectorLayout,
    onLayoutChange: onInspectorLayoutChange,
  } = useDefaultLayout({
    id: "skybridge-devtools-inspector-section",
    storage: localStorage,
  });
  const { defaultLayout: mainLayout, onLayoutChange: onMainLayoutChange } =
    useDefaultLayout({
      id: "skybridge-devtools-main-section",
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
        orientation="vertical"
        className="flex-1 overflow-hidden"
        defaultLayout={mainLayout}
        onLayoutChange={onMainLayoutChange}
      >
        <Panel id="top-section" minSize="30">
          <Group
            orientation="horizontal"
            className="flex-1 overflow-hidden"
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
        </Panel>
        {shouldDisplayWidgetSection && (
          <>
            <Separator className="h-px bg-border" />
            <Panel id="widget-section" minSize="20">
              <Group
                orientation="horizontal"
                className="flex-1 overflow-hidden bg-card"
                defaultLayout={inspectorLayout}
                onLayoutChange={onInspectorLayoutChange}
              >
                <Panel id="widget-logs-panel" minSize="30">
                  <div className="flex flex-col h-full overflow-hidden">
                    <Group
                      orientation="vertical"
                      className="flex-1 overflow-hidden"
                      defaultLayout={widgetLayout}
                      onLayoutChange={onWidgetLayoutChange}
                    >
                      <Panel id="widget-panel" minSize="20" maxSize="80">
                        <div className="h-full overflow-hidden">
                          <Suspense>
                            <Widget />
                          </Suspense>
                        </div>
                      </Panel>
                      <Separator className="h-px bg-border" />
                      <Panel id="logs-panel" minSize="20">
                        <div className="p-4 flex flex-col h-full min-h-0">
                          <OpenAiLogs />
                        </div>
                      </Panel>
                    </Group>
                  </div>
                </Panel>
                <Separator className="w-px bg-border" />
                <Panel
                  id="inspector-panel"
                  minSize="20"
                  maxSize="50"
                  defaultSize={30}
                >
                  <div className="flex flex-col overflow-hidden h-full min-h-0">
                    <div className="overflow-auto">
                      <OpenAiInspector />
                    </div>
                  </div>
                </Panel>
              </Group>
            </Panel>
          </>
        )}
      </Group>
    </div>
  );
};

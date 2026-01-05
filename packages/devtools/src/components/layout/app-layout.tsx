import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable.js";
import { useResizablePanelSize } from "@/hooks/use-resizable-panel-size.js";
import { useSelectedToolOrNull } from "@/lib/mcp/index.js";
import { Header } from "./header.js";
import { Intro } from "./intro.js";
import { ToolPanel } from "./tool-panel/tool-panel.js";
import ToolsList from "./tools-list.js";

function AppLayout() {
  const selectedTool = useSelectedToolOrNull();
  const toolsListSize = useResizablePanelSize({
    key: "skybridge-devtools-tools-list-width",
    defaultSizePercent: 20, // ~256px out of ~1280px viewport
    minSizePercent: 15,
    maxSizePercent: 40,
  });

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <Header />
      <ResizablePanelGroup
        direction="horizontal"
        className="flex flex-1 overflow-hidden"
        onLayout={(sizes) => {
          if (sizes[0] !== undefined) {
            toolsListSize.onResize(sizes[0]);
          }
        }}
      >
        <ResizablePanel
          defaultSize={toolsListSize.size}
          minSize={15}
          maxSize={40}
        >
          <ToolsList />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={100 - toolsListSize.size} minSize={30}>
          <div className="flex flex-1 flex-col overflow-hidden relative h-full">
            {selectedTool ? <ToolPanel /> : <Intro />}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default AppLayout;

import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
} from "react-resizable-panels";
import { useSelectedToolOrNull } from "@/lib/mcp/index.js";
import { Header } from "./header.js";
import { Intro } from "./intro.js";
import { ToolPanel } from "./tool-panel/tool-panel.js";
import ToolsList from "./tools-list.js";

function AppLayout() {
  const selectedTool = useSelectedToolOrNull();
  const { defaultLayout, onLayoutChange } = useDefaultLayout({
    id: "skybridge-devtools-tools-list",
    storage: localStorage,
  });

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <Header />
      <Group
        orientation="horizontal"
        className="flex-1 overflow-hidden"
        defaultLayout={defaultLayout}
        onLayoutChange={onLayoutChange}
      >
        <Panel id="tools-list" minSize="15" maxSize="40">
          <ToolsList />
        </Panel>
        <Separator className="w-px bg-border" />
        <Panel id="main-content" minSize="30">
          <div className="flex flex-1 flex-col overflow-hidden relative h-full">
            {selectedTool ? <ToolPanel /> : <Intro />}
          </div>
        </Panel>
      </Group>
    </div>
  );
}

export default AppLayout;

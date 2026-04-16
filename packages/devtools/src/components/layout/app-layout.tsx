import { PlugZap } from "lucide-react";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
} from "react-resizable-panels";
import { useAuthStore } from "@/lib/auth-store.js";
import { connectToServer, useSelectedToolOrNull } from "@/lib/mcp/index.js";
import { Button } from "../ui/button.js";
import { Header } from "./header.js";
import { Intro } from "./intro.js";
import { ToolPanel } from "./tool-panel/tool-panel.js";
import ToolsList from "./tools-list.js";

function AppLayout() {
  const selectedTool = useSelectedToolOrNull();
  const { status, requiresAuth } = useAuthStore();
  const { defaultLayout, onLayoutChange } = useDefaultLayout({
    id: "skybridge-devtools-tools-list",
    storage: localStorage,
  });

  const isConnected = status === "authenticated";

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <Header />
      {isConnected ? (
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
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {status === "connecting"
                ? "Connecting to server..."
                : requiresAuth
                  ? "Authentication required to access this server."
                  : "Not connected to a server."}
            </p>
            {status !== "connecting" && (
              <Button variant="outline" size="sm" onClick={connectToServer}>
                <PlugZap className="h-3.5 w-3.5" />
                Connect
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AppLayout;

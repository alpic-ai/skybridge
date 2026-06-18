import { Button } from "@alpic-ai/ui/components/button";
import { PlugZap } from "lucide-react";
import { Suspense } from "react";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
} from "react-resizable-panels";
import { useAuthStore } from "@/lib/auth-store.js";
import { connectToServer } from "@/lib/mcp/index.js";
import { Header } from "./header.js";
import { ToolPanel } from "./tool-panel/index.js";
import ToolsList from "./tools-list/index.js";

const TOOLS_SPLIT_GROUP_ID = "devtools-tools-split";
const TOOLS_LIST_PANEL_ID = "tools-list";
const TOOL_PANEL_ID = "tool-panel";

function AppLayout() {
  const { status, requiresAuth } = useAuthStore();

  const isConnected = status === "authenticated";

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: TOOLS_SPLIT_GROUP_ID,
    panelIds: [TOOLS_LIST_PANEL_ID, TOOL_PANEL_ID],
    storage: localStorage,
  });

  return (
    <div className="grid h-screen grid-rows-[auto_1fr] overflow-hidden bg-background text-foreground">
      <Header />
      {isConnected ? (
        <div
          id="devtools-card-body"
          className="relative flex min-h-0 min-w-0 flex-1"
        >
          <Group
            orientation="horizontal"
            id={TOOLS_SPLIT_GROUP_ID}
            className="flex min-h-0 min-w-0 flex-1"
            defaultLayout={defaultLayout}
            onLayoutChanged={onLayoutChanged}
          >
            <Panel
              id={TOOLS_LIST_PANEL_ID}
              defaultSize={380}
              minSize={250}
              maxSize={510}
              className="min-h-0 min-w-0"
            >
              <aside className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
                <Suspense fallback={null}>
                  <ToolsList />
                </Suspense>
              </aside>
            </Panel>
            <Separator className="w-px shrink-0 bg-border transition-colors hover:bg-ring data-separator-active:bg-ring" />
            <Panel id={TOOL_PANEL_ID} minSize={320} className="min-h-0 min-w-0">
              <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
                <Suspense fallback={null}>
                  <ToolPanel />
                </Suspense>
              </main>
            </Panel>
          </Group>
        </div>
      ) : (
        <div className="flex items-center justify-center">
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              {status === "connecting"
                ? "Connecting to server..."
                : requiresAuth
                  ? "Authentication required to access this server."
                  : "Not connected to a server."}
            </p>
            {status !== "connecting" && (
              <Button variant="secondary" onClick={connectToServer}>
                <PlugZap className="size-3.5" />
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

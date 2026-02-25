import { PlugZap, SquareTerminal, X } from "lucide-react";
import { useState } from "react";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
} from "react-resizable-panels";
import { ClaudeTerminal } from "@/components/claude-session/claude-terminal.js";
import { useAuthStore } from "@/lib/auth-store.js";
import { connectToServer, useSelectedToolOrNull } from "@/lib/mcp/index.js";
import { cn } from "@/lib/utils.js";
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
  const [claudeOpen, setClaudeOpen] = useState(false);

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

      {/* Floating Claude terminal — always mounted to keep session alive */}
      <div
        className={cn(
          "fixed bottom-16 right-4 z-50 w-[680px] h-[480px] rounded-lg border border-zinc-800 shadow-2xl overflow-hidden",
          !claudeOpen && "hidden",
        )}
      >
        <ClaudeTerminal />
      </div>

      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setClaudeOpen((o) => !o)}
        className={cn(
          "fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg transition-colors",
          claudeOpen
            ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            : "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
      >
        {claudeOpen ? (
          <X className="h-4 w-4" />
        ) : (
          <SquareTerminal className="h-4 w-4" />
        )}
        Claude
      </button>
    </div>
  );
}

export default AppLayout;

import { Button } from "@alpic-ai/ui/components/button";
import { PlugZap } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store.js";
import { connectToServer, useSelectedToolOrNull } from "@/lib/mcp/index.js";
import { Header } from "./header.js";
import { ToolPanel } from "./tool-panel/tool-panel.js";
import ToolsList from "./tools-list/index.js";

function AppLayout() {
  const selectedTool = useSelectedToolOrNull();
  const { status, requiresAuth } = useAuthStore();

  const isConnected = status === "authenticated";

  if (!selectedTool) {
    return <div>No tool screen - Todo</div>;
  }

  return (
    <div className="grid h-screen grid-rows-[auto_1fr] gap-3 overflow-hidden bg-background p-3">
      <Header />
      {isConnected ? (
        <div className="grid min-h-0 grid-cols-[280px_1fr] gap-3">
          <ToolsList />
          <main className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <ToolPanel />
          </main>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
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

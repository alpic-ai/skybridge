import { ExternalLink, LogOut, PlugZap } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store.js";
import { connectToServer, logout, useServerInfo } from "@/lib/mcp/index.js";
import { useSelectedToolName } from "@/lib/nuqs.js";
import { Button } from "../ui/button.js";
import { StatusBadge } from "./status-badge.js";

export const Header = () => {
  const serverInfo = useServerInfo();
  const name = serverInfo?.name;
  const version = serverInfo?.version;
  const [, setSelectedTool] = useSelectedToolName();
  const { status, requiresAuth, error } = useAuthStore();

  return (
    <div className="flex flex-col border-b border-border bg-background">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="font-semibold cursor-pointer"
            onClick={() => {
              setSelectedTool(null);
            }}
          >
            Skybridge
          </button>
          <span className="h-4 w-px bg-border" aria-hidden="true" />

          {name && (
            <div className="flex items-center gap-4 rounded-md border border-border bg-muted px-2 py-1">
              <span className="text-xs font-medium text-muted-foreground">
                {name}
              </span>
              {version && (
                <span className="text-xs text-muted-foreground">
                  v{version}
                </span>
              )}
            </div>
          )}

          {error && (
            <span className="text-xs text-red-600 max-w-48 truncate">
              {error}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {requiresAuth && <StatusBadge status={status} />}

          {requiresAuth &&
            (status === "authenticated" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  logout();
                }}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={connectToServer}>
                <PlugZap className="h-3.5 w-3.5" />
                Connect
              </Button>
            ))}

          <Button variant="ghost" size="sm" className="h-8 gap-2">
            <a
              href="https://docs.skybridge.tech/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              Learn more about Skybridge
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

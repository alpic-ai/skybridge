import { Button } from "@alpic-ai/ui/components/button";
import { cn } from "@alpic-ai/ui/lib/cn";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store.js";
import { logout, useServerInfo } from "@/lib/mcp/index.js";
import { useSelectedToolName } from "@/lib/nuqs.js";
import { StatusBadge } from "./status-badge.js";

function SkybridgeLogo() {
  return (
    <img src="/skybridge.svg" alt="" aria-hidden className={cn("size-5")} />
  );
}

export const Header = () => {
  const serverInfo = useServerInfo();
  const name = serverInfo?.name;
  const version = serverInfo?.version;
  const [, setSelectedTool] = useSelectedToolName();
  const { status, requiresAuth, error } = useAuthStore();

  return (
    <header className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-2.5 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSelectedTool(null)}
          className="flex cursor-pointer items-center gap-2"
        >
          <SkybridgeLogo />
          <span className="font-semibold">Skybridge</span>
        </button>

        {name && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
            {name}
            {version && (
              <span className="border-l border-border pl-1.5 text-subtle-foreground">
                v{version}
              </span>
            )}
          </span>
        )}

        {error && (
          <span className="max-w-48 truncate text-xs text-destructive">
            {error}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {requiresAuth && <StatusBadge status={status} />}
        {requiresAuth && status === "authenticated" && (
          <Button variant="secondary" onClick={() => logout()}>
            <LogOut className="size-3.5" />
            Sign out
          </Button>
        )}
      </div>
    </header>
  );
};

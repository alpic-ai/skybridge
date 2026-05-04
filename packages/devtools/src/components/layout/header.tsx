import { Button } from "@alpic-ai/ui/components/button";
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store.js";
import { logout, useServerInfo } from "@/lib/mcp/index.js";
import { Separator } from "../ui/separator.js";
import { StatusBadge } from "./status-badge.js";

const EXTERNAL_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "discord", href: "#" },
  { label: "docs", href: "#" },
  { label: "github", href: "#" },
];

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md px-2.5 text-sm  bg-light-gray border">
      {children}
    </div>
  );
}

function BrandChip() {
  const serverInfo = useServerInfo();
  const name = serverInfo?.name ?? "skybridge";
  const version = serverInfo?.version;
  return (
    <Chip>
      <img src="/skybridge.svg" alt="" aria-hidden className="size-3.5" />
      <span>{name}</span>
      <Separator orientation="vertical" className="h-4 self-center!" />
      {version && (
        <span className="font-mono text-xs text-quaternary-foreground">
          {version}
        </span>
      )}
    </Chip>
  );
}

export const Header = () => {
  const { status, requiresAuth, error } = useAuthStore();

  return (
    <header className="flex h-13 items-center justify-between gap-3 border-b border-border px-4">
      <div className="flex items-center gap-2">
        <BrandChip />
        {error && (
          <span className="ml-2 max-w-48 truncate text-xs text-destructive">
            {error}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {requiresAuth && <StatusBadge status={status} />}
        {requiresAuth && status === "authenticated" && (
          <Button variant="tertiary" onClick={() => logout()}>
            <LogOut className="size-3.5" />
            Sign out
          </Button>
        )}
        <nav className="flex items-center gap-1 text-xs">
          {EXTERNAL_LINKS.map((link, i) => (
            <span key={link.label} className="inline-flex items-center gap-1">
              {i > 0 && <span aria-hidden>·</span>}
              <Button asChild variant="tertiary">
                <a href={link.href} target="_blank" rel="noreferrer noopener">
                  {link.label}
                </a>
              </Button>
            </span>
          ))}
        </nav>
      </div>
    </header>
  );
};

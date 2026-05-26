import { Button } from "@alpic-ai/ui/components/button";
import { Separator } from "@alpic-ai/ui/components/separator";
import { LogIn, LogOut } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store.js";
import { logout, signIn, useServerInfo } from "@/lib/mcp/index.js";
import { StatusBadge } from "./status-badge.js";
import {
  AuditButton,
  DeployButton,
  PlaygroundButton,
  TunnelButton,
} from "./toolbar-actions.js";

const EXTERNAL_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "discord", href: "https://discord.gg/awV4gu74wK" },
  { label: "docs", href: "https://docs.skybridge.tech/" },
  { label: "github", href: "https://github.com/alpic-ai/skybridge" },
];

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-sm  bg-light-gray border">
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
  const { status, requiresAuth, hasAuthRequiredTools, isSignedIn, error } =
    useAuthStore();

  const showSignIn =
    requiresAuth &&
    status === "authenticated" &&
    hasAuthRequiredTools &&
    !isSignedIn;
  const showSignOut = requiresAuth && status === "authenticated" && isSignedIn;

  return (
    <header className="flex h-13 items-center justify-between gap-3 border-b border-border px-4">
      <div className="flex items-center gap-12">
        <BrandChip />
      </div>

      <div className="flex items-center gap-2">
        <TunnelButton />
        <PlaygroundButton />
        <AuditButton />
        <DeployButton />
      </div>
      <div className="flex items-center gap-3">
        {error && (
          <span className="max-w-48 truncate text-xs text-destructive">
            {error}
          </span>
        )}
        {requiresAuth && <StatusBadge status={status} />}
        {showSignIn && (
          <Button variant="tertiary" onClick={() => signIn()}>
            <LogIn className="size-3.5" />
            Sign in
          </Button>
        )}
        {showSignOut && (
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

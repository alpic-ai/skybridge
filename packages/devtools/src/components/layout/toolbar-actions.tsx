import { Button } from "@alpic-ai/ui/components/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@alpic-ai/ui/components/popover";
import { Separator } from "@alpic-ai/ui/components/separator";
import {
  Check,
  ClipboardCheck,
  Copy,
  ExternalLinkIcon,
  Loader2Icon,
  MessagesSquareIcon,
  TriangleAlertIcon,
  UnplugIcon,
} from "lucide-react";
import {
  cloneElement,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useCopyToClipboard } from "@/lib/copy.js";
import {
  type DeployProgress,
  type DeployStatus,
  useDeployStore,
} from "@/lib/deploy-store.js";
import { useServerInfo } from "@/lib/mcp/index.js";
import { useTunnelStore } from "@/lib/tunnel-store.js";
import { cn } from "@/lib/utils.js";
import { DeployProjectDialog } from "./deploy-project-dialog.js";

const DOT_BY_STATUS = {
  idle: "bg-gray-400",
  starting: "bg-orange-500 animate-pulse",
  connected: "bg-green-500",
  error: "bg-red-500",
} as const;

const HOVER_CLOSE_DELAY_MS = 120;
const DESCRIPTION_MAX_W = "max-w-[200px]";

function useHoverOpen() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
      }
    },
    [],
  );

  const onEnter = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  }, []);

  const onLeave = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
    }
    closeTimer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY_MS);
  }, []);

  return { open, setOpen, onEnter, onLeave };
}

type HoverHandlers = {
  onMouseEnter: MouseEventHandler;
  onMouseLeave: MouseEventHandler;
};

function HoverPopover({
  trigger,
  className,
  children,
}: {
  trigger: ReactElement<HoverHandlers>;
  className?: string;
  children: ReactNode;
}) {
  const { open, setOpen, onEnter, onLeave } = useHoverOpen();
  const anchorId = useId();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        {cloneElement(trigger, {
          onMouseEnter: onEnter,
          onMouseLeave: onLeave,
          "data-popover-anchor": anchorId,
        } as Partial<HoverHandlers> & { "data-popover-anchor": string })}
      </PopoverAnchor>
      <PopoverContent
        align="end"
        sideOffset={0}
        className={cn("p-4", className)}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (
            target?.closest?.(`[data-popover-anchor="${CSS.escape(anchorId)}"]`)
          ) {
            e.preventDefault();
          }
        }}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

function TunnelLinkButton({
  label,
  icon,
  buildUrl,
  description,
}: {
  label: string;
  icon: ReactNode;
  buildUrl: (tunnelUrl: string) => string;
  description: string;
}) {
  const state = useTunnelStore((s) => s.state);
  const start = useTunnelStore((s) => s.start);
  const [pendingOpen, setPendingOpen] = useState(false);
  const url = state.status === "connected" ? buildUrl(state.url) : null;

  useEffect(() => {
    if (pendingOpen && state.status === "connected") {
      window.open(buildUrl(state.url), "_blank", "noreferrer,noopener");
      setPendingOpen(false);
    } else if (
      pendingOpen &&
      (state.status === "error" || state.status === "idle")
    ) {
      setPendingOpen(false);
    }
  }, [pendingOpen, state, buildUrl]);

  const onClick = () => {
    if (url) {
      window.open(url, "_blank", "noreferrer,noopener");
      return;
    }
    setPendingOpen(true);
    start();
  };

  const isLaunching = pendingOpen;
  const isDisabled = !url && state.status === "starting";

  return (
    <HoverPopover
      className="w-72"
      trigger={
        <Button
          variant="secondary"
          aria-disabled={isDisabled}
          className={cn(isDisabled && "opacity-50 cursor-not-allowed")}
          icon={
            isLaunching ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              icon
            )
          }
          onClick={isDisabled ? undefined : onClick}
        >
          {label}
        </Button>
      }
    >
      {url ? (
        <p
          className={cn(
            "text-sm text-muted-foreground text-center mx-auto",
            DESCRIPTION_MAX_W,
          )}
        >
          {description}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground text-center">
          {isLaunching
            ? `Starting the tunnel, ${label} will open shortly…`
            : `Click to start the tunnel and open ${label}.`}
        </p>
      )}
    </HoverPopover>
  );
}

export function PlaygroundButton() {
  return (
    <TunnelLinkButton
      label="Playground"
      icon={<MessagesSquareIcon className="size-3.5" />}
      buildUrl={(tunnelUrl) => `${tunnelUrl}/try`}
      description="Chat with your MCP server with a real LLM and share it"
    />
  );
}

export function AuditButton() {
  return (
    <TunnelLinkButton
      label="Audit"
      icon={<ClipboardCheck className="size-3.5" />}
      buildUrl={(tunnelUrl) =>
        `https://app.alpic.ai/beacon?url=${encodeURIComponent(`${tunnelUrl}/mcp`)}`
      }
      description="Audit your MCP server's tools, prompts, and resources"
    />
  );
}

const ALPIC_APP_URL = "https://app.alpic.ai";

export function DeployButton() {
  const { status, progress, redeploy, createAndDeploy, signIn } =
    useDeployStore();
  const serverInfo = useServerInfo();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // A deploy is in progress per this session's SSE stream, or per the API's
  // latest deployment (survives refresh / triggered elsewhere) — keep the dot,
  // the popover, and the disabled state in agreement.
  const deploying =
    progress.status === "deploying" ||
    (status.state === "ready" && status.lastDeployStatus === "ongoing");
  // A git-linked project routes redeploy through the popover's explicit
  // "Deploy anyway" (an overwrite guard), so the main button is gated there.
  const gitGated = status.state === "ready" && !!status.lastDeployGit;
  // aria-disabled (not the native attribute) so the button stays hoverable —
  // the popover keeps showing progress/guidance while it's disabled. Only
  // enabled when a plain click does something (signedOut, needsProject, ready
  // without a git overwrite to confirm).
  const disabled =
    signingIn ||
    deploying ||
    gitGated ||
    status.state === "loading" ||
    status.state === "noTeam" ||
    status.state === "error";

  const onSignIn = () => {
    setActionError(null);
    setSigningIn(true);
    signIn()
      .catch((err) =>
        setActionError(err instanceof Error ? err.message : "Sign-in failed"),
      )
      .finally(() => setSigningIn(false));
  };

  const doRedeploy = () => {
    setActionError(null);
    redeploy().catch((err) =>
      setActionError(err instanceof Error ? err.message : "Deploy failed"),
    );
  };

  const onTriggerClick = () => {
    setActionError(null);
    if (status.state === "signedOut") {
      onSignIn();
      return;
    }
    if (status.state === "ready") {
      doRedeploy();
      return;
    }
    if (status.state === "needsProject") {
      setDialogOpen(true);
    }
  };

  return (
    <>
      <HoverPopover
        className="w-72"
        trigger={
          <Button
            variant="cta"
            className={cn(
              "h-8 px-2 gap-1",
              disabled && "opacity-50 cursor-not-allowed",
            )}
            aria-disabled={disabled}
            icon={
              signingIn ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <span
                  className={`h-2 w-2 rounded-full ${deployDotClass(status, progress)}`}
                  aria-hidden
                />
              )
            }
            onClick={disabled ? undefined : onTriggerClick}
          >
            Deploy
          </Button>
        }
      >
        <DeployPopoverContent
          status={status}
          progress={progress}
          signingIn={signingIn}
          actionError={actionError}
          onRedeploy={doRedeploy}
          onSignIn={onSignIn}
        />
      </HoverPopover>
      {status.state === "needsProject" && (
        <DeployProjectDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          defaultName={serverInfo?.name ?? "my-mcp-app"}
          teams={status.teams}
          defaultTeamId={status.defaultTeamId}
          staleConfig={status.staleConfig}
          onCreate={createAndDeploy}
        />
      )}
    </>
  );
}

function DeployPopoverContent({
  status,
  progress,
  signingIn,
  actionError,
  onRedeploy,
  onSignIn,
}: {
  status: DeployStatus;
  progress: DeployProgress;
  signingIn: boolean;
  actionError: string | null;
  onRedeploy: () => void;
  onSignIn: () => void;
}) {
  if (progress.status === "deploying") {
    return (
      <DeployingContent
        phase={progress.phase}
        startedAt={progress.startedAt}
        deploymentPageUrl={progress.deploymentPageUrl}
      />
    );
  }

  if (progress.status === "deployed") {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">Deployed</p>
        <CopyUrlRow url={progress.mcpServerUrl} />
        {progress.deploymentPageUrl && (
          <>
            <Separator />
            <DeploymentPageButton href={progress.deploymentPageUrl} />
          </>
        )}
      </div>
    );
  }

  if (progress.status === "failed") {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-red-500">Deployment failed</p>
        <p className="text-xs text-muted-foreground">{progress.message}</p>
        {progress.deploymentPageUrl && (
          <>
            <Separator />
            <ExternalLinkRow
              href={progress.deploymentPageUrl}
              label="Go to logs"
            />
          </>
        )}
      </div>
    );
  }

  // progress idle → reflect readiness/auth status
  switch (status.state) {
    case "loading":
      return <p className="text-sm text-muted-foreground">Checking Alpic…</p>;
    case "signedOut":
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium">Sign in to Alpic to deploy</p>
          <p className="text-xs text-muted-foreground">
            Connect your Alpic account to deploy this server.
          </p>
          <Button
            variant="primary"
            className="h-7 w-full"
            disabled={signingIn}
            onClick={onSignIn}
          >
            {signingIn ? "Signing in…" : "Sign in to Alpic"}
          </Button>
          {actionError && <p className="text-xs text-red-500">{actionError}</p>}
        </div>
      );
    case "noTeam":
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium">No team yet</p>
          <p className="text-xs text-muted-foreground">
            Create a team on Alpic before deploying.
          </p>
          <ExternalLinkRow href={ALPIC_APP_URL} label="Open Alpic" />
        </div>
      );
    case "needsProject":
      return <p className="text-sm">Click to deploy to Alpic</p>;
    case "ready":
      // A deploy is running (this session's SSE stream ended, or it was
      // triggered elsewhere/by git) — show progress, not the idle CTA.
      if (status.lastDeployStatus === "ongoing") {
        return (
          <DeployingContent
            phase="Deploying"
            startedAt={status.lastDeployStartedAt ?? null}
            deploymentPageUrl={status.deploymentPageUrl ?? null}
          />
        );
      }
      return (
        <div className="space-y-2">
          <p className="text-sm">Click to deploy to Alpic</p>
          {status.mcpServerUrl && (
            <>
              <p className="text-xs font-medium text-muted-foreground">
                Last Deployment:
              </p>
              <CopyUrlRow url={status.mcpServerUrl} />
            </>
          )}
          {status.deploymentPageUrl && (
            <>
              <Separator />
              <DeploymentPageButton href={status.deploymentPageUrl} />
            </>
          )}
          {status.lastDeployGit && (
            <div className="space-y-2 rounded-md border border-orange-300 bg-orange-50 p-2">
              <p className="flex items-center gap-1.5 text-xs text-orange-700">
                <TriangleAlertIcon className="size-3.5 shrink-0" />
                Last deployed from Git — redeploying replaces it.
              </p>
              <GitDeployInfo git={status.lastDeployGit} />
              <Button
                variant="primary"
                className="h-7 w-full"
                onClick={onRedeploy}
              >
                Deploy anyway
              </Button>
            </div>
          )}
          {actionError && <p className="text-xs text-red-500">{actionError}</p>}
        </div>
      );
    case "error":
      return <p className="text-xs text-red-500">{status.message}</p>;
  }
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0
    ? `${minutes}m ${String(seconds).padStart(2, "0")}s`
    : `${seconds}s`;
}

function DeployingContent({
  phase,
  startedAt,
  deploymentPageUrl,
}: {
  phase: string;
  // Anchored to the server-provided start (replayed over SSE, or the latest
  // deployment's startedAt on reconnect) so the clock survives hover remounts
  // and page refreshes. Absent only when no start is known.
  startedAt: number | null;
  deploymentPageUrl: string | null;
}) {
  const [elapsedMs, setElapsedMs] = useState(() =>
    startedAt == null ? 0 : Date.now() - startedAt,
  );
  useEffect(() => {
    if (startedAt == null) {
      return;
    }
    const tick = () => setElapsedMs(Date.now() - startedAt);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Loader2Icon className="size-3.5 shrink-0 animate-spin" />
        <p className="text-sm">{phase}…</p>
        {startedAt != null && (
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {formatElapsed(elapsedMs)}
          </span>
        )}
      </div>
      {deploymentPageUrl && (
        <>
          <Separator />
          <ExternalLinkRow href={deploymentPageUrl} label="Go to logs" />
        </>
      )}
    </div>
  );
}

function deployDotClass(
  status: DeployStatus,
  progress: DeployProgress,
): string {
  if (progress.status === "deploying") {
    return "bg-orange-500 animate-pulse";
  }
  if (progress.status === "failed") {
    return "bg-red-500";
  }
  if (progress.status === "deployed") {
    return "bg-green-500";
  }
  // No active deploy this session — reflect the linked project's last deploy.
  if (status.state === "ready") {
    switch (status.lastDeployStatus) {
      case "ongoing":
        return "bg-orange-500 animate-pulse";
      case "failed":
      case "canceled":
        return "bg-red-500";
      case "deployed":
        return "bg-green-500";
      default:
        return status.mcpServerUrl ? "bg-green-500" : "bg-gray-400";
    }
  }
  return "bg-gray-400";
}

function CopyUrlRow({ url }: { url: string }) {
  const { copied, copy } = useCopyToClipboard();
  return (
    <button
      type="button"
      aria-label="Copy MCP server URL"
      onClick={() => copy(url)}
      className="flex w-full items-center gap-2 rounded-md border bg-light-gray px-2 py-1.5 text-left hover:bg-background-hover"
    >
      <span className="flex-1 truncate font-mono text-xs">{url}</span>
      <span className="text-quaternary-foreground">
        {copied ? (
          <Check className="size-3.5" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </span>
    </button>
  );
}

function DeploymentPageButton({ href }: { href: string }) {
  return (
    <Button asChild variant="tertiary" className="w-full">
      <a href={href} target="_blank" rel="noreferrer noopener">
        <ExternalLinkIcon className="size-3.5" />
        Go to deployment page
      </a>
    </Button>
  );
}

function GitDeployInfo({
  git,
}: {
  git: {
    ref: string | null;
    commitMessage: string | null;
    author: string | null;
  };
}) {
  if (!git.ref && !git.commitMessage && !git.author) {
    return null;
  }
  return (
    <div className="space-y-0.5 text-xs text-orange-700/90">
      {git.ref && (
        <p>
          Branch <span className="font-mono">{git.ref}</span>
          {git.author && <> · by {git.author}</>}
        </p>
      )}
      {git.commitMessage && <p className="truncate">“{git.commitMessage}”</p>}
    </div>
  );
}

function ExternalLinkRow({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
    >
      <ExternalLinkIcon className="size-3.5" />
      {label}
    </a>
  );
}

export function TunnelButton() {
  const { state, start, stop } = useTunnelStore();
  const { copied, copy } = useCopyToClipboard();

  const mcpUrl = state.status === "connected" ? `${state.url}/mcp` : null;
  const onClick = mcpUrl
    ? () => copy(mcpUrl)
    : state.status === "starting"
      ? stop
      : start;

  return (
    <HoverPopover
      className={cn(
        "w-60 text-center",
        state.status === "starting" && "animate-pulse w-60",
      )}
      trigger={
        <Button variant="secondary" onClick={onClick}>
          <span
            className={`h-2 w-2 rounded-full ${DOT_BY_STATUS[state.status]}`}
            aria-hidden
          />
          {mcpUrl ? (
            <>
              <span className="mx-2 font-mono text-xs">
                {mcpUrl.replace(/^https?:\/\//, "")}
              </span>
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </>
          ) : (
            "Tunnel"
          )}
        </Button>
      }
    >
      {state.status === "idle" && <IdleContent />}
      {state.status === "error" && (
        <ErrorContent message={state.message} onRetry={start} />
      )}
      {state.status === "starting" && (
        <StartingContent message={state.message} />
      )}
      {state.status === "connected" && <ConnectedContent onStop={stop} />}
    </HoverPopover>
  );
}

function IdleContent() {
  return (
    <div className="space-y-3">
      <p
        className={cn(
          "text-sm text-muted-foreground mx-auto",
          DESCRIPTION_MAX_W,
        )}
      >
        Get a public URL that you can use in Claude or ChatGPT.
      </p>
    </div>
  );
}

function ErrorContent({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-3 text-left">
      <p className="text-sm text-destructive">{message}</p>
      <Button variant="primary" className="w-full" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function StartingContent({ message }: { message: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2">
        <span
          className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"
          aria-hidden
        />
        <p className={cn("text-sm text-muted-foreground", DESCRIPTION_MAX_W)}>
          {message}
        </p>
        <Loader2Icon className="size-3.5 animate-spin" />
      </div>
    </div>
  );
}

function ConnectedContent({ onStop }: { onStop: () => void }) {
  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">
          Click to copy the tunnel URL to use in Claude or ChatGPT
        </p>
      </div>
      <Separator />
      <Button
        variant="tertiary"
        className="w-full"
        onClick={onStop}
        icon={<UnplugIcon />}
      >
        Stop tunnel
      </Button>
    </div>
  );
}

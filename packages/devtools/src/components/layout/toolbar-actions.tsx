import { WarningAlert } from "@alpic-ai/ui/components/alert";
import { Button } from "@alpic-ai/ui/components/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@alpic-ai/ui/components/popover";
import { Separator } from "@alpic-ai/ui/components/separator";
import { Spinner } from "@alpic-ai/ui/components/spinner";
import {
  StatusDot,
  type StatusDotVariantProps,
} from "@alpic-ai/ui/components/status-dot";
import {
  TaskProgress,
  type TaskProgressStep,
} from "@alpic-ai/ui/components/task-progress";
import {
  Check,
  ClipboardCheck,
  Copy,
  ExternalLinkIcon,
  Globe,
  MessagesSquareIcon,
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
  idle: { variant: "muted", pulse: false },
  starting: { variant: "warning", pulse: true },
  connected: { variant: "success", pulse: false },
  error: { variant: "destructive", pulse: false },
} as const satisfies Record<string, StatusDotVariantProps>;

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
            isLaunching ? <Spinner size="sm" className="text-current" /> : icon
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

const DEPLOY_STEPS = [
  { id: "collect", label: "Collecting files" },
  { id: "upload", label: "Uploading source" },
  { id: "trigger", label: "Triggering deployment" },
  { id: "deploy", label: "Deploying" },
] as const;

export function LiveUrlChip() {
  const url = useDeployStore((s) =>
    s.status.state === "ready" && s.status.mcpServerUrl
      ? s.status.mcpServerUrl
      : s.progress.status === "deployed"
        ? s.progress.mcpServerUrl
        : null,
  );
  const { copied, copy } = useCopyToClipboard();
  if (!url) {
    return null;
  }
  const host = url.replace(/^https?:\/\//, "");
  return (
    <button
      type="button"
      aria-label="Copy live MCP server URL"
      onClick={() => copy(url)}
      className="inline-flex h-8 items-center gap-2 rounded-md border bg-light-gray px-2.5 text-sm hover:bg-background-hover"
    >
      <Globe className="size-3.5 text-quaternary-foreground" aria-hidden />
      <span className="max-w-48 truncate font-mono text-xs">{host}</span>
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

export function DeployButton() {
  const { status, progress, redeploy, createAndDeploy, signIn } =
    useDeployStore();
  const serverInfo = useServerInfo();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const deploying =
    progress.status === "deploying" ||
    (status.state === "ready" && status.lastDeployStatus === "ongoing");
  const gitGated = status.state === "ready" && !!status.lastDeployGit;
  // aria-disabled (not the native attribute) so the button stays hoverable and
  // the popover keeps showing progress/guidance while disabled.
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
                <Spinner size="sm" className="text-current" />
              ) : (
                <StatusDot
                  className="size-2"
                  {...deployDotVariant(status, progress)}
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

  const gitGated = status.state === "ready" && !!status.lastDeployGit;

  if (progress.status === "deployed" && !gitGated) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">Deployed</p>
        <CopyUrlRow url={progress.mcpServerUrl} />
        {progress.deploymentPageUrl && (
          <DeploymentPageButton href={progress.deploymentPageUrl} />
        )}
      </div>
    );
  }

  if (progress.status === "failed" && !gitGated) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-destructive">
          Deployment failed
        </p>
        <p className="text-xs text-muted-foreground">{progress.message}</p>
        {progress.deploymentPageUrl && (
          <ExternalLinkRow
            href={progress.deploymentPageUrl}
            label="Go to logs"
          />
        )}
      </div>
    );
  }

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
          {actionError && (
            <p className="text-xs text-destructive">{actionError}</p>
          )}
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
          {!status.lastDeployGit && (
            <p className="text-sm">Click to deploy to Alpic</p>
          )}
          {status.mcpServerUrl && (
            <>
              <p className="text-xs font-medium text-muted-foreground">
                Last Deployment:
              </p>
              <CopyUrlRow url={status.mcpServerUrl} />
            </>
          )}
          {status.deploymentPageUrl && (
            <DeploymentPageButton href={status.deploymentPageUrl} />
          )}
          {status.lastDeployGit && (
            <WarningAlert
              className="px-3 py-2"
              title="Last deployed from Git"
              description={
                <div className="space-y-2">
                  <GitDeployInfo git={status.lastDeployGit} />
                  <Button
                    variant="primary"
                    className="h-7 w-full"
                    onClick={onRedeploy}
                  >
                    Deploy anyway
                  </Button>
                </div>
              }
            />
          )}
          {actionError && (
            <p className="text-xs text-destructive">{actionError}</p>
          )}
        </div>
      );
    case "error":
      return <p className="text-xs text-destructive">{status.message}</p>;
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
  // Server-provided start, so the elapsed clock survives hover remounts and
  // page refreshes.
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

  const currentIdx = Math.max(
    0,
    DEPLOY_STEPS.findIndex((s) => s.label === phase),
  );
  const steps: TaskProgressStep[] = DEPLOY_STEPS.map((step, i) => ({
    id: step.id,
    label: step.label,
    status: i < currentIdx ? "done" : i === currentIdx ? "running" : "pending",
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Deploying…</p>
        {startedAt != null && (
          <span className="font-mono text-xs text-muted-foreground">
            {formatElapsed(elapsedMs)}
          </span>
        )}
      </div>
      <TaskProgress steps={steps} />
      {deploymentPageUrl && (
        <ExternalLinkRow href={deploymentPageUrl} label="Go to logs" />
      )}
    </div>
  );
}

function deployDotVariant(
  status: DeployStatus,
  progress: DeployProgress,
): StatusDotVariantProps {
  if (progress.status === "deploying") {
    return { variant: "warning", pulse: true };
  }
  const gitGated = status.state === "ready" && !!status.lastDeployGit;
  if (progress.status === "failed" && !gitGated) {
    return { variant: "destructive", pulse: false };
  }
  if (progress.status === "deployed" && !gitGated) {
    return { variant: "success", pulse: false };
  }
  if (status.state === "ready") {
    switch (status.lastDeployStatus) {
      case "ongoing":
        return { variant: "warning", pulse: true };
      case "failed":
      case "canceled":
        return { variant: "destructive", pulse: false };
      case "deployed":
        return { variant: "success", pulse: false };
    }
  }
  return { variant: "muted", pulse: false };
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
    <div className="space-y-0.5 text-xs">
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
          <StatusDot
            className="size-2"
            {...DOT_BY_STATUS[state.status]}
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
        <StatusDot className="size-2" variant="warning" pulse aria-hidden />
        <p className={cn("text-sm text-muted-foreground", DESCRIPTION_MAX_W)}>
          {message}
        </p>
        <Spinner size="sm" className="text-current" />
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

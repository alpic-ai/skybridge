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
  Loader2Icon,
  MessagesSquareIcon,
  RocketIcon,
  UnplugIcon,
} from "lucide-react";
import {
  cloneElement,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTunnelStore } from "@/lib/tunnel-store.js";
import { cn } from "@/lib/utils.js";

const DOT_BY_STATUS = {
  idle: "bg-red-500",
  starting: "bg-orange-500 animate-pulse",
  connected: "bg-green-500",
  error: "bg-red-500",
} as const;

const HOVER_CLOSE_DELAY_MS = 120;
const COPIED_RESET_MS = 1500;
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

function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    },
    [],
  );

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
      resetTimer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch (err) {
      console.error("Clipboard write failed", err);
    }
  }, []);

  return { copied, copy };
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
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        {cloneElement(trigger, {
          onMouseEnter: onEnter,
          onMouseLeave: onLeave,
        })}
      </PopoverAnchor>
      <PopoverContent
        align="end"
        sideOffset={0}
        className={cn("p-4", className)}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const { copied, copy } = useCopyToClipboard();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => copy(value)}
      className="text-quaternary-foreground hover:text-foreground"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
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
        `https://app.alpic.ai/beacon?url=${encodeURIComponent(tunnelUrl)}`
      }
      description="Audit your MCP server's tools, prompts, and resources"
    />
  );
}

export function DeployButton() {
  const command = "pnpm deploy";

  return (
    <HoverPopover
      className="w-60"
      trigger={
        <Button variant="cta" icon={<RocketIcon className="size-3.5" />}>
          Deploy
        </Button>
      }
    >
      <div className="space-y-3">
        <p
          className={cn(
            "text-sm text-muted-foreground py-2 mx-auto text-center",
            DESCRIPTION_MAX_W,
          )}
        >
          Run this command to deploy your project to the Alpic platform
        </p>
        <div className="flex items-center gap-2 rounded-md border bg-light-gray px-2 py-1.5">
          <span className="flex-1 truncate font-mono text-xs">{command}</span>
          <CopyButton value={command} label="Copy command" />
        </div>
      </div>
    </HoverPopover>
  );
}

export function TunnelButton() {
  const { state, start, stop } = useTunnelStore();
  const { copied, copy } = useCopyToClipboard();

  const isConnected = state.status === "connected";
  const onClick = isConnected
    ? () => copy(state.url)
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
          {isConnected ? (
            <>
              <span className="mx-2 font-mono text-xs">
                {state.url.replace(/^https?:\/\//, "")}
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

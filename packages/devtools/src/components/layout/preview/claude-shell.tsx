import { ArrowUp, SlidersVertical } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  useInspectorPreferencesStore,
  useIsMobile,
} from "@/lib/inspector-preferences-store.js";
import { cn } from "@/lib/utils.js";
import { claudeFontsCss } from "../tool-panel/view/claude-host-context.js";
import { CrossIcon } from "./chatgpt-icons.js";
import {
  ArtifactsIcon,
  ChatBubbleIcon,
  ChatsTasksIcon,
  ChevronDownIcon,
  ClaudeWaveformIcon,
  ClaudeWordmark,
  CodeTabIcon,
  CustomizeIcon,
  DesignIcon,
  HomeIcon,
  MicIcon,
  PlusIcon,
  ProjectsIcon,
  ScheduledClockIcon,
  SearchIcon,
  SidebarToggleIcon,
} from "./claude-icons.js";

const FONT_STACK = '"Anthropic Sans", ui-sans-serif, system-ui, sans-serif';

const shellColors = {
  light: {
    "--shell-surface": "#faf9f5",
    "--shell-sidebar": "#fbfbf9",
    "--shell-card": "#ffffff",
    "--shell-panel": "#ffffff",
    "--shell-text": "#141413",
    "--shell-text-secondary": "#3d3d3a",
    "--shell-text-tertiary": "#73726c",
    "--shell-nav-text": "#52514e",
    "--shell-icon-muted": "#898781",
    "--shell-segment-bg": "#edece8",
    "--shell-segment-active": "#f9f9f7",
    "--shell-btn-bg": "#f3f3f3",
    "--shell-border": "rgba(31, 30, 29, 0.08)",
    "--shell-composer-border": "rgba(31, 30, 29, 0.08)",
    "--shell-accent": "#d97757",
  },
  dark: {
    "--shell-surface": "#1a1a19",
    "--shell-sidebar": "#1a1a19",
    "--shell-card": "#383835",
    "--shell-panel": "#383835",
    "--shell-text": "#faf9f5",
    "--shell-text-secondary": "#c2c0b6",
    "--shell-text-tertiary": "#9c9a92",
    "--shell-nav-text": "#c2c0b6",
    "--shell-icon-muted": "#9c9a92",
    "--shell-segment-bg": "#3a3a38",
    "--shell-segment-active": "#4a4a47",
    "--shell-btn-bg": "#3a3a38",
    "--shell-border": "rgba(222, 220, 209, 0.1)",
    "--shell-composer-border": "transparent",
    "--shell-accent": "#d97757",
  },
};

function Bar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-md bg-[color-mix(in_oklab,var(--shell-text)_10%,transparent)] motion-safe:animate-pulse",
        className,
      )}
    />
  );
}

function MobileHeader() {
  return (
    <div
      aria-hidden
      className="flex h-12 shrink-0 cursor-not-allowed items-center gap-2.5 px-3"
    >
      <SidebarToggleIcon className="size-4.5 text-[#7b7974]" />
      <div className="flex items-center gap-1.5">
        <Bar className="h-3.5 w-24" />
        <ChevronDownIcon className="size-2.5 text-(--shell-text-tertiary)" />
      </div>
      <div className="ml-auto flex h-7 items-center rounded-[7px] bg-(--shell-btn-bg) px-3 text-(--shell-text) text-sm">
        Share
      </div>
    </div>
  );
}

function MobileComposer() {
  return (
    <>
      <div className="flex min-h-[100px] flex-col justify-between rounded-[20px] bg-(--shell-card) p-3 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <span className="px-1.5 pt-1 text-[15px] text-(--shell-text-tertiary)">
          Write a message...
        </span>
        <div className="flex items-center px-1 pb-0.5 text-(--shell-text-secondary)">
          <PlusIcon className="size-5" />
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <Bar className="h-3.5 w-14" />
            <Bar className="h-3.5 w-9" />
            <ChevronDownIcon className="size-3" />
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <MicIcon className="size-5" />
            <div className="flex size-8 items-center justify-center rounded-lg bg-(--shell-accent) text-white">
              <ArrowUp className="size-4.5" />
            </div>
          </div>
        </div>
      </div>
      <div className="pt-1.5 pb-1 text-center text-(--shell-text-tertiary) text-xs">
        Claude can make mistakes. Please double-check responses.
      </div>
    </>
  );
}

function DesktopComposer() {
  return (
    <div className="flex min-h-[100px] flex-col justify-between rounded-[20px] border border-(--shell-composer-border) bg-(--shell-card) p-4 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <span className="text-(--shell-text-tertiary)">Reply to Claude...</span>
      <div className="flex items-center justify-between">
        <PlusIcon className="size-5 text-(--shell-text-secondary)" />
        <div className="flex items-center gap-4 text-(--shell-text-secondary)">
          <div className="flex items-center gap-1.5">
            <Bar className="h-3.5 w-14" />
            <Bar className="h-3.5 w-9" />
            <ChevronDownIcon className="size-3" />
          </div>
          <MicIcon className="size-5" />
          <ClaudeWaveformIcon className="size-5" />
        </div>
      </div>
    </div>
  );
}

const recentRowWidths = [
  "w-[80%]",
  "w-[65%]",
  "w-[74%]",
  "w-[58%]",
  "w-[70%]",
  "w-[62%]",
];

export function ClaudeShell({ children }: { children: ReactNode }) {
  const theme = useInspectorPreferencesStore((s) => s.theme);
  const displayMode = useInspectorPreferencesStore((s) => s.displayMode);
  const setPreference = useInspectorPreferencesStore((s) => s.setPreference);
  const isMobile = useIsMobile();
  const isFullscreen = displayMode === "fullscreen";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const thread = threadRef.current;
    if (!scroller || !thread) {
      return;
    }
    const pinToBottom = () => {
      scroller.scrollTop = scroller.scrollHeight;
    };
    pinToBottom();
    const observer = new ResizeObserver(pinToBottom);
    observer.observe(thread);
    const unpin = () => observer.disconnect();
    const unpinEvents = ["wheel", "touchstart", "pointerdown"] as const;
    for (const event of unpinEvents) {
      scroller.addEventListener(event, unpin, { once: true, passive: true });
    }
    return () => {
      observer.disconnect();
      for (const event of unpinEvents) {
        scroller.removeEventListener(event, unpin);
      }
    };
  }, []);

  return (
    <div
      className="@container/shell relative isolate flex h-full w-full overflow-hidden bg-(--shell-surface) text-(--shell-text)"
      style={{ fontFamily: FONT_STACK, ...shellColors[theme] }}
    >
      <style>{claudeFontsCss}</style>
      <aside
        aria-hidden
        className={cn(
          "h-full w-[288px] shrink-0 cursor-not-allowed border-(--shell-border) border-r bg-(--shell-sidebar) @max-[640px]/shell:hidden",
          (sidebarCollapsed || isMobile) && "hidden",
        )}
      >
        <div className="flex h-full flex-col px-2 pb-2">
          <div className="flex h-11 shrink-0 items-center justify-between px-2">
            <ClaudeWordmark className="h-5" />
            <div className="flex items-center gap-1 text-[#7b7974]">
              <button
                type="button"
                aria-label="Collapse sidebar"
                onClick={() => setSidebarCollapsed(true)}
                className="flex size-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-[color-mix(in_oklab,var(--shell-text)_5%,transparent)]"
              >
                <SidebarToggleIcon className="size-4" />
              </button>
              <div className="flex size-7 items-center justify-center">
                <SearchIcon className="size-4" />
              </div>
            </div>
          </div>
          <div className="mb-2 flex h-8 shrink-0 rounded-lg bg-(--shell-segment-bg) p-px">
            <div className="flex flex-[1.1] items-center justify-center gap-1.5 rounded-[7px] bg-(--shell-segment-active) text-(--shell-text) text-sm shadow-[inset_0_0_0_0.5px_rgba(11,11,11,0.1),0_1px_2px_rgba(0,0,0,0.06),0_2px_6px_-1px_rgba(0,0,0,0.05)]">
              <HomeIcon className="size-4" />
              <span>Home</span>
            </div>
            <div className="flex flex-1 items-center justify-center gap-1.5 text-(--shell-text-tertiary) text-sm">
              <CodeTabIcon className="size-4" />
              <span>Code</span>
            </div>
          </div>
          <div className="flex h-8 shrink-0 items-center gap-2 rounded-lg px-1.5 text-(--shell-nav-text) text-sm">
            <PlusIcon className="size-4" />
            <span>New</span>
          </div>
          {[
            { icon: ChatsTasksIcon, label: "Chats and tasks" },
            { icon: ProjectsIcon, label: "Projects" },
            { icon: ArtifactsIcon, label: "Artifacts" },
            { icon: ScheduledClockIcon, label: "Scheduled" },
            { icon: CustomizeIcon, label: "Customize" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex h-8 shrink-0 items-center gap-2 px-1.5 text-(--shell-nav-text) text-sm"
            >
              <Icon className="size-5" />
              <span>{label}</span>
            </div>
          ))}
          <div className="mt-5 mb-1 px-1.5 text-(--shell-text-tertiary) text-xs">
            Pinned
          </div>
          <div className="flex h-8 shrink-0 items-center gap-2 px-1.5">
            <ChatBubbleIcon className="size-5 shrink-0 text-(--shell-icon-muted)" />
            <Bar className="h-3.5 w-32" />
          </div>
          <div className="mt-5 mb-1 flex items-center justify-between px-1.5">
            <span className="text-(--shell-text-tertiary) text-xs">
              Recents
            </span>
            <SlidersVertical className="size-3.5 text-(--shell-text-tertiary)" />
          </div>
          {recentRowWidths.map((width) => (
            <div
              key={width}
              className="flex h-8 shrink-0 items-center gap-2 px-1.5"
            >
              <ChatBubbleIcon className="size-5 shrink-0 text-(--shell-icon-muted)" />
              <Bar className={cn("h-3.5", width)} />
            </div>
          ))}
          <div className="mt-auto flex shrink-0 flex-col">
            <div className="flex h-10 items-center gap-2.5 border-(--shell-border) border-t px-1.5 text-(--shell-nav-text) text-sm">
              <DesignIcon className="size-5" />
              <span>Design</span>
            </div>
            <div className="flex h-11 items-center gap-2.5 border-(--shell-border) border-t px-1.5">
              <Bar className="size-7 rounded-full" />
              <Bar className="h-3.5 w-24" />
            </div>
          </div>
        </div>
      </aside>
      <div className="relative flex h-full min-w-0 flex-1 flex-col">
        {isMobile && !isFullscreen && <MobileHeader />}
        {sidebarCollapsed && !isMobile && (
          <button
            type="button"
            aria-label="Expand sidebar"
            onClick={() => setSidebarCollapsed(false)}
            className="absolute top-2 left-2 z-40 flex size-8 cursor-pointer items-center justify-center rounded-md text-[#7b7974] transition-colors hover:bg-[color-mix(in_oklab,var(--shell-text)_5%,transparent)]"
          >
            <SidebarToggleIcon className="size-4" />
          </button>
        )}
        <div
          ref={scrollerRef}
          className="min-h-0 flex-1 overflow-y-auto [container-type:size]"
        >
          <div
            ref={threadRef}
            className={cn(
              "mx-auto flex w-full max-w-[720px] flex-col px-4 pt-6 pb-24",
              isFullscreen && "h-full max-w-none px-5 pt-2 pb-4",
              isFullscreen && sidebarCollapsed && !isMobile && "pl-12",
            )}
          >
            {[
              ["w-[92%]", "w-[80%]", "w-[55%]"],
              ["w-[88%]", "w-[76%]", "w-[50%]"],
            ].map((widths, index) => (
              <div
                key={widths[0]}
                className={cn(
                  "flex flex-col",
                  isFullscreen && "hidden",
                  index > 0 && "mt-10",
                )}
              >
                <div className="h-16 w-[55%] self-end rounded-xl bg-[color-mix(in_oklab,var(--shell-text)_5%,transparent)] motion-safe:animate-pulse" />
                <div className="mt-6 flex flex-col gap-3">
                  {widths.map((width) => (
                    <Bar key={width} className={cn("h-4", width)} />
                  ))}
                </div>
              </div>
            ))}
            <div
              className={cn(
                "mt-10 h-12 w-[45%] self-end rounded-xl bg-[color-mix(in_oklab,var(--shell-text)_5%,transparent)] motion-safe:animate-pulse",
                isFullscreen && "hidden",
              )}
            />
            <Bar className={cn("mt-6 h-4 w-40", isFullscreen && "hidden")} />
            <div
              className={cn(
                "relative mt-3 w-full",
                !isFullscreen && !isMobile && "-mx-4 w-[calc(100%+2rem)]",
                isFullscreen &&
                  "mt-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-(--shell-border) bg-(--shell-panel)",
              )}
            >
              {isFullscreen ? (
                <div className="flex h-14 shrink-0 items-center gap-2.5 border-(--shell-border) border-b px-4">
                  <div className="flex size-7 items-center justify-center rounded-lg border border-(--shell-border) bg-(--shell-segment-active)">
                    <Bar className="size-3.5 rounded" />
                  </div>
                  <Bar className="h-4 w-44" />
                  <button
                    type="button"
                    aria-label="Exit fullscreen"
                    onClick={() => setPreference("displayMode", "inline")}
                    className="ml-auto flex size-8 cursor-pointer items-center justify-center rounded-lg bg-(--shell-btn-bg) text-(--shell-text) transition-colors hover:bg-[color-mix(in_oklab,var(--shell-text)_10%,transparent)]"
                  >
                    <CrossIcon className="size-4.5" />
                  </button>
                </div>
              ) : null}
              <div className={cn("w-full", isFullscreen && "min-h-0 flex-1")}>
                {children ?? <Bar className="h-96 w-full rounded-2xl" />}
              </div>
              {isFullscreen && !isMobile ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-4 mx-auto w-[min(680px,85%)]">
                  <div className="flex min-h-[100px] flex-col justify-between rounded-[20px] border border-(--shell-composer-border) bg-(--shell-card) p-4 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                    <span className="text-(--shell-text-tertiary)">
                      Write a message...
                    </span>
                    <div className="flex items-center justify-between">
                      <PlusIcon className="size-5 text-(--shell-text-secondary)" />
                      <div className="flex items-center gap-4 text-(--shell-text-secondary)">
                        <div className="flex items-center gap-1.5">
                          <Bar className="h-3.5 w-14" />
                          <Bar className="h-3.5 w-9" />
                          <ChevronDownIcon className="size-3" />
                        </div>
                        <MicIcon className="size-5" />
                        <ClaudeWaveformIcon className="size-5" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div
              className={cn(
                "mt-6 flex flex-col gap-3",
                isFullscreen && "hidden",
              )}
            >
              <Bar className="h-4 w-[95%]" />
              <Bar className="h-4 w-[60%]" />
            </div>
          </div>
        </div>
        <div
          className={cn(
            "w-full shrink-0 cursor-not-allowed",
            isMobile ? "px-2 pb-1" : "px-4 pb-5",
            isFullscreen && "hidden",
          )}
        >
          <div className="mx-auto w-full max-w-[768px]">
            {isMobile ? <MobileComposer /> : <DesktopComposer />}
          </div>
        </div>
      </div>
    </div>
  );
}

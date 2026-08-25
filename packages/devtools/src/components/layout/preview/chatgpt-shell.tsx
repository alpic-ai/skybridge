import {
  type ComponentType,
  type CSSProperties,
  type ReactNode,
  type SVGProps,
  useEffect,
  useRef,
} from "react";
import type { Theme } from "skybridge/web";
import {
  useInspectorPreferencesStore,
  useIsMobile,
} from "@/lib/inspector-preferences-store.js";
import { cn } from "@/lib/utils.js";
import {
  AgentRobotIcon,
  BlossomIcon,
  BooksIcon,
  ChatBubbleIcon,
  CodexIcon,
  ComposeIcon,
  CrossIcon,
  DotsIcon,
  FolderIcon,
  MenuIcon,
  MicrophoneIcon,
  PluginsIcon,
  PlusIcon,
  SearchIcon,
  SidebarIcon,
  SkillsIcon,
  TasksIcon,
  VoiceIcon,
} from "./chatgpt-icons.js";

const FONT_STACK =
  'ui-sans-serif, -apple-system, system-ui, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif';

const shellThemes: Record<Theme, Record<string, string>> = {
  light: {
    "--main-surface-primary": "#fcfcfc",
    "--sidebar-surface": "#fcfcfc",
    "--message-surface": "#e9e9e980",
    "--composer-surface-primary": "#fff",
    "--text-primary": "#0d0d0d",
    "--text-secondary": "#5d5d5d",
    "--text-tertiary": "#8f8f8f",
    "--border-default": "#0000001a",
    "--bg-elevated-primary": "#fff",
    "--sidebar-surface-secondary": "#ececec",
  },
  dark: {
    "--main-surface-primary": "#000",
    "--sidebar-surface": "#000",
    "--message-surface": "#323232d9",
    "--composer-surface-primary": "#212121",
    "--text-primary": "#fff",
    "--text-secondary": "#cdcdcd",
    "--text-tertiary": "#afafaf",
    "--border-default": "#ffffff26",
    "--bg-elevated-primary": "#1b1b1b",
    "--sidebar-surface-secondary": "#303030",
  },
};

function Bar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-md bg-[color-mix(in_oklab,var(--text-primary)_10%,transparent)]",
        className,
      )}
    />
  );
}

const navItems: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
}[] = [
  { icon: ComposeIcon, label: "New chat" },
  { icon: FolderIcon, label: "Projects" },
  { icon: TasksIcon, label: "Tasks" },
  { icon: BooksIcon, label: "Library" },
  { icon: PluginsIcon, label: "Plugins" },
  { icon: AgentRobotIcon, label: "Agents" },
  { icon: CodexIcon, label: "Codex" },
  { icon: SkillsIcon, label: "GPTs" },
];
const historyRowWidths = [
  "w-[85%]",
  "w-[70%]",
  "w-[78%]",
  "w-[62%]",
  "w-[82%]",
  "w-[68%]",
  "w-[75%]",
  "w-[60%]",
];

function MobileHeader() {
  return (
    <div
      aria-hidden
      className="absolute inset-x-0 top-0 z-10 flex h-[52px] cursor-not-allowed items-center justify-between px-3"
    >
      <div className="flex size-10 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--text-primary)_4%,transparent)] backdrop-blur-sm">
        <MenuIcon className="size-6" />
      </div>
      <div className="flex h-10 items-center gap-5 rounded-xl bg-[color-mix(in_oklab,var(--text-primary)_4%,transparent)] px-4 backdrop-blur-sm">
        <ComposeIcon className="size-6" />
        <DotsIcon className="size-6" />
      </div>
    </div>
  );
}

function MobileComposer() {
  return (
    <div className="rounded-[28px] bg-(--composer-surface-primary) p-2 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
      <div className="px-2.5 pt-1.5 pb-3 text-(--text-tertiary)">
        Ask ChatGPT
      </div>
      <div className="flex items-center gap-3 px-1.5 pb-0.5">
        <PlusIcon className="size-5 shrink-0" />
        <Bar className="h-4 w-16" />
        <div className="flex-1" />
        <Bar className="h-4 w-14" />
        <MicrophoneIcon className="size-6 shrink-0" />
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--text-primary) text-(--main-surface-primary)">
          <VoiceIcon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function DesktopComposer() {
  return (
    <div className="flex h-[52px] items-center gap-3 rounded-full border border-(--border-default) bg-(--composer-surface-primary) px-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
      <PlusIcon className="size-5 shrink-0" />
      <span className="flex-1 text-(--text-tertiary)">Ask ChatGPT</span>
      <MicrophoneIcon className="size-6 shrink-0" />
      <div className="flex size-9.5 shrink-0 items-center justify-center rounded-full bg-(--text-primary) text-(--main-surface-primary)">
        <VoiceIcon className="size-5.5" />
      </div>
    </div>
  );
}

function UserPill({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-11 w-2/5 self-end rounded-3xl bg-(--message-surface)",
        className,
      )}
    />
  );
}

export function ChatgptShell({ children }: { children: ReactNode }) {
  const theme = useInspectorPreferencesStore((s) => s.theme);
  const displayMode = useInspectorPreferencesStore((s) => s.displayMode);
  const setPreference = useInspectorPreferencesStore((s) => s.setPreference);
  const isMobile = useIsMobile();
  const isPip = displayMode === "pip";
  const isFullscreen = displayMode === "fullscreen";
  const scrollerRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const thread = threadRef.current;
    if (!scroller || !thread || isFullscreen) {
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
  }, [isFullscreen]);

  return (
    <div
      className="@container/shell relative isolate flex h-full w-full overflow-hidden bg-(--main-surface-primary) text-(--text-primary)"
      style={{ fontFamily: FONT_STACK, ...shellThemes[theme] } as CSSProperties}
    >
      <aside
        aria-hidden
        className={cn(
          "h-full shrink-0 cursor-not-allowed border-(--border-default) border-r bg-(--sidebar-surface) @max-[640px]/shell:hidden",
          isFullscreen ? "w-[52px]" : "w-[260px]",
          isMobile && "hidden",
        )}
      >
        <div
          className={cn(
            "h-full flex-col px-1.5 pb-2",
            isFullscreen ? "hidden" : "flex",
          )}
        >
          <div className="flex h-[52px] shrink-0 items-center justify-between pr-2.5 pl-3">
            <span className="font-semibold text-base">ChatGPT</span>
            <div className="flex items-center gap-4 text-(--text-secondary)">
              <SearchIcon className="size-5" />
              <SidebarIcon className="size-5" />
            </div>
          </div>
          {navItems.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] px-2.5 text-sm leading-5"
            >
              <Icon className="size-5 shrink-0" />
              <span>{label}</span>
            </div>
          ))}
          <Bar className="mt-6 mb-2 ml-2 h-3 w-14" />
          {historyRowWidths.map((width) => (
            <div key={width} className="px-2 py-2">
              <Bar className={cn("h-3.5", width)} />
            </div>
          ))}
          <div className="mt-auto flex items-center gap-2 px-2 py-2">
            <Bar className="size-8 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Bar className="h-3 w-24" />
              <Bar className="h-2.5 w-16" />
            </div>
          </div>
        </div>
        <div
          className={cn(
            "h-full flex-col items-center gap-5 py-4",
            isFullscreen ? "flex" : "hidden",
          )}
        >
          <BlossomIcon className="size-6" />
          <ComposeIcon className="mt-4 size-5" />
          <SearchIcon className="size-5" />
          <ChatBubbleIcon className="size-5" />
          <BooksIcon className="size-5" />
          <Bar className="mt-auto size-8 rounded-full" />
        </div>
      </aside>
      <div className="relative flex h-full min-w-0 flex-1 flex-col">
        {isMobile && !isFullscreen && <MobileHeader />}
        <div
          className={cn(
            "h-[52px] shrink-0 items-center px-4",
            isFullscreen ? "flex" : "hidden",
          )}
        >
          <button
            type="button"
            aria-label="Exit fullscreen"
            onClick={() => setPreference("displayMode", "inline")}
            className="-ml-2 flex size-9 cursor-pointer items-center justify-center rounded-lg text-(--text-primary) transition-colors hover:bg-[color-mix(in_oklab,var(--text-primary)_5%,transparent)]"
          >
            <CrossIcon className="size-5" />
          </button>
          <div
            aria-hidden
            className="flex flex-1 items-center justify-center gap-2"
          >
            <Bar className="size-5 rounded-md" />
            <Bar className="h-4 w-28" />
          </div>
          <div className="w-5" />
        </div>
        <div
          ref={scrollerRef}
          className="min-h-0 flex-1 overflow-y-auto [container-type:size]"
        >
          <div
            ref={threadRef}
            className={cn(
              "mx-auto flex w-full max-w-[768px] flex-col px-4 py-6",
              isMobile && !isFullscreen && "pt-16",
              isFullscreen && "h-full max-w-none p-0",
            )}
          >
            {[
              ["w-[92%]", "w-[80%]", "w-[55%]"],
              ["w-[88%]", "w-[76%]", "w-[50%]"],
              ["w-[95%]", "w-[70%]", "w-[62%]"],
            ].map((widths, index) => (
              <div
                key={widths[0]}
                className={cn(
                  "flex flex-col",
                  isFullscreen && "hidden",
                  index > 0 && "mt-10",
                )}
              >
                <UserPill />
                <div className="mt-6 flex flex-col gap-3">
                  {widths.map((width) => (
                    <Bar key={width} className={cn("h-4", width)} />
                  ))}
                </div>
              </div>
            ))}
            <UserPill className={cn("mt-10", isFullscreen && "hidden")} />
            <Bar className={cn("mt-6 h-4 w-40", isFullscreen && "hidden")} />
            <div
              className={cn(
                "mt-6 flex items-center gap-2",
                isFullscreen && "hidden",
              )}
            >
              <Bar className="size-5 rounded-md" />
              <Bar className="h-4 w-[110px]" />
            </div>
            <div
              className={cn(
                "relative mt-3 w-full",
                !isPip &&
                  !isFullscreen &&
                  !isMobile &&
                  "-mx-4 w-[calc(100%+2rem)]",
                isPip &&
                  "absolute top-4 left-1/2 z-30 mt-0 w-[min(768px,calc(100%-32px))] translate-x-[calc(-50%-8px)] rounded-3xl border border-(--border-default) bg-(--main-surface-primary) shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
                isFullscreen && "mt-0 min-h-0 flex-1",
              )}
            >
              {isPip ? (
                <button
                  type="button"
                  aria-label="Exit picture-in-picture"
                  onClick={() => setPreference("displayMode", "inline")}
                  className="-top-2.5 -left-2.5 absolute z-10 flex size-8 cursor-pointer items-center justify-center rounded-full bg-[#414141] text-white"
                >
                  <CrossIcon className="size-4.5" />
                </button>
              ) : null}
              <div
                className={cn(
                  "w-full",
                  isPip && "max-h-[80cqh] overflow-y-auto rounded-3xl",
                  isFullscreen && "h-full min-h-0",
                  isMobile &&
                    !isPip &&
                    !isFullscreen &&
                    "overflow-hidden rounded-xl border border-(--border-default)",
                )}
              >
                {children ?? <Bar className="h-96 w-full rounded-2xl" />}
              </div>
            </div>
            <div
              className={cn(
                "mt-6 border-(--border-default) border-t",
                isFullscreen && "hidden",
              )}
            />
            <div
              className={cn(
                "mt-6 flex flex-col gap-3",
                isFullscreen && "hidden",
              )}
            >
              <Bar className="h-4 w-[95%]" />
              <Bar className="h-4 w-[88%]" />
              <Bar className="h-4 w-[60%]" />
            </div>
            <div
              className={cn(
                "mt-4 flex items-center gap-3 pb-4",
                isFullscreen && "hidden",
              )}
            >
              <Bar className="size-4 rounded-full" />
              <Bar className="size-4 rounded-full" />
              <Bar className="size-4 rounded-full" />
              <Bar className="size-4 rounded-full" />
            </div>
          </div>
        </div>
        <div
          aria-hidden
          className={cn(
            "w-full shrink-0 cursor-not-allowed px-4",
            isMobile ? "pb-4" : "pb-6",
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

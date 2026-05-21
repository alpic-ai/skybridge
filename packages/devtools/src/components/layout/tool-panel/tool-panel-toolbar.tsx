import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@alpic-ai/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@alpic-ai/ui/components/popover";
import {
  Check,
  Languages,
  Logs,
  type LucideIcon,
  Maximize2,
  Monitor,
  Moon,
  PictureInPicture2,
  Smartphone,
  SquareSplitVertical,
  Sun,
} from "lucide-react";
import { useState } from "react";
import type { RequestDisplayMode } from "skybridge/web";

import { useInspectorPreferencesStore } from "@/lib/inspector-preferences-store.js";
import { cn } from "@/lib/utils.js";
import { locales } from "./locales.js";

const displayModes: { mode: RequestDisplayMode; icon: LucideIcon }[] = [
  { mode: "fullscreen", icon: Maximize2 },
  { mode: "pip", icon: PictureInPicture2 },
  { mode: "inline", icon: SquareSplitVertical },
];

const buttonBaseClass =
  "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const buttonIdleClass =
  "text-light-gray-foreground hover:bg-light-gray hover:text-foreground";
const buttonSelectedClass = "bg-muted text-foreground";

function ToolbarButton({
  icon: Icon,
  label,
  selected,
  onClick,
  className,
}: {
  icon: LucideIcon;
  label: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        buttonBaseClass,
        "border border-border bg-background",
        selected ? buttonSelectedClass : buttonIdleClass,
        className,
      )}
    >
      <Icon className="size-3.5" />
      <span>{label}</span>
    </button>
  );
}

type ToolPanelToolbarProps = {
  logsOpen: boolean;
  onOpenLogs: () => void;
};

export const ToolPanelToolbar = ({
  logsOpen,
  onOpenLogs,
}: ToolPanelToolbarProps) => {
  const displayMode = useInspectorPreferencesStore((s) => s.displayMode);
  const theme = useInspectorPreferencesStore((s) => s.theme);
  const locale = useInspectorPreferencesStore((s) => s.locale);
  const userAgent = useInspectorPreferencesStore((s) => s.userAgent);
  const setPreference = useInspectorPreferencesStore((s) => s.setPreference);

  const [localeOpen, setLocaleOpen] = useState(false);

  const isDark = theme === "dark";
  const isMobile = (userAgent?.device?.type ?? "desktop") === "mobile";
  const localeLabel =
    locales.find((l) => l.code === locale)?.englishName ?? locale;

  return (
    <div className="mt-3 flex w-full shrink-0 items-center gap-1.5 px-3">
      <div className="inline-flex h-7 items-center rounded-md border border-border bg-background p-0.5">
        {displayModes.map(({ mode, icon: Icon }) => {
          const selected = displayMode === mode;
          return (
            <button
              key={mode}
              type="button"
              aria-pressed={selected}
              onClick={() => setPreference("displayMode", mode)}
              className={cn(
                "inline-flex h-full cursor-pointer items-center gap-1.5 rounded px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                selected ? buttonSelectedClass : buttonIdleClass,
              )}
            >
              <Icon className="size-3.5" />
              <span>{mode}</span>
            </button>
          );
        })}
      </div>

      <ToolbarButton
        icon={isDark ? Moon : Sun}
        label={isDark ? "dark" : "light"}
        onClick={() => setPreference("theme", isDark ? "light" : "dark")}
      />

      <Popover open={localeOpen} onOpenChange={setLocaleOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Locale"
            className={cn(
              buttonBaseClass,
              "border border-border bg-background",
              buttonIdleClass,
              "aria-expanded:bg-muted aria-expanded:text-foreground",
            )}
          >
            <Languages className="size-3.5" />
            <span>{localeLabel}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search locale..." />
            <CommandList>
              <CommandEmpty>No locale found.</CommandEmpty>
              <CommandGroup>
                {locales.map((l) => (
                  <CommandItem
                    key={l.code}
                    value={l.code}
                    keywords={[l.englishName, l.localeName]}
                    onSelect={(v) => {
                      setPreference("locale", v);
                      setLocaleOpen(false);
                    }}
                  >
                    <span className="truncate">
                      {l.englishName}
                      {l.localeName !== l.englishName ? (
                        <span className="ml-1.5 text-muted-foreground">
                          {l.localeName}
                        </span>
                      ) : null}
                    </span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        locale === l.code ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {displayMode !== "fullscreen" && (
        <ToolbarButton
          icon={isMobile ? Smartphone : Monitor}
          label={isMobile ? "mobile" : "desktop"}
          onClick={() =>
            setPreference("userAgent", {
              ...userAgent,
              device: {
                ...userAgent?.device,
                type: isMobile ? "desktop" : "mobile",
              },
            })
          }
        />
      )}

      {!logsOpen && displayMode !== "fullscreen" && (
        <ToolbarButton
          icon={Logs}
          label="logs"
          className="ml-auto"
          onClick={onOpenLogs}
        />
      )}
    </div>
  );
};

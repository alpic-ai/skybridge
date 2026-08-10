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
  ArrowLeftRight,
  Check,
  Eye,
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
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import type { RequestDisplayMode } from "skybridge/web";

import { useInspectorPreferencesStore } from "@/lib/inspector-preferences-store.js";
import { cn } from "@/lib/utils.js";
import { locales } from "./locales.js";
import { isOneOf } from "./utils.js";

const displayModes: { mode: RequestDisplayMode; icon: LucideIcon }[] = [
  { mode: "fullscreen", icon: Maximize2 },
  { mode: "pip", icon: PictureInPicture2 },
  { mode: "inline", icon: SquareSplitVertical },
];

// Applies the form's current values to the preferences store and returns a
// human-readable summary for the agent.
function applyViewOptions(data: FormData): string {
  const { userAgent, displayMode, previewClient, setPreference } =
    useInspectorPreferencesStore.getState();

  // Checkboxes are absent from FormData when unchecked, so absence is
  // meaningful (false) — apply unconditionally.
  setPreference("theme", data.has("darkTheme") ? "dark" : "light");
  const mobile = data.has("mobileDevice");
  setPreference("userAgent", {
    ...userAgent,
    device: { ...userAgent?.device, type: mobile ? "mobile" : "desktop" },
    capabilities: { hover: !mobile, touch: mobile },
  });
  if (mobile && displayMode === "pip" && previewClient === "chatgpt") {
    setPreference("displayMode", "fullscreen");
  }

  const locale = data.get("locale");
  if (
    isOneOf(
      locale,
      locales.map((l) => l.code),
    )
  ) {
    setPreference("locale", locale);
  }

  const next = useInspectorPreferencesStore.getState();
  return `View preview options: displayMode=${next.displayMode}, theme=${next.theme}, locale=${next.locale}, device=${next.userAgent?.device?.type ?? "desktop"}.`;
}

// Visually-hidden native select mirroring one preference, so the declarative
// WebMCP form derives an enum input schema from it and agents can set it —
// while the visible toolbar keeps its custom (non-form-control) buttons.
// Changes (from agents or from the visible buttons writing into it) are
// applied exclusively through the form's submit handler.
function ViewOptionSelect({
  name,
  description,
  value,
  options,
}: {
  name: string;
  description: string;
  value: string;
  options: readonly string[];
}) {
  return (
    <select
      name={name}
      toolparamdescription={description}
      value={value}
      tabIndex={-1}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

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

function ToolbarToggle({
  icon: Icon,
  label,
  name,
  description,
  checked,
}: {
  icon: LucideIcon;
  label: string;
  name: string;
  description: string;
  checked: boolean;
}) {
  return (
    <label
      className={cn(
        buttonBaseClass,
        "border border-border bg-background",
        buttonIdleClass,
        "has-focus-visible:ring-1 has-focus-visible:ring-ring",
      )}
    >
      <input
        type="checkbox"
        name={name}
        toolparamdescription={description}
        checked={checked}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="sr-only"
      />
      <Icon className="size-3.5" />
      <span>{label}</span>
    </label>
  );
}

type ToolbarVariant = "panel" | "preview";

type ToolPanelToolbarProps = {
  variant?: ToolbarVariant;
  logsOpen?: boolean;
  onOpenLogs?: () => void;
};

export const ToolPanelToolbar = ({
  variant = "panel",
  logsOpen,
  onOpenLogs,
}: ToolPanelToolbarProps) => {
  const displayMode = useInspectorPreferencesStore((s) => s.displayMode);
  const theme = useInspectorPreferencesStore((s) => s.theme);
  const locale = useInspectorPreferencesStore((s) => s.locale);
  const userAgent = useInspectorPreferencesStore((s) => s.userAgent);
  const previewClient = useInspectorPreferencesStore((s) => s.previewClient);
  const setPreviewClient = useInspectorPreferencesStore(
    (s) => s.setPreviewClient,
  );
  const setPreference = useInspectorPreferencesStore((s) => s.setPreference);

  const formRef = useRef<HTMLFormElement>(null);
  const [localeOpen, setLocaleOpen] = useState(false);

  const submitLocale = (code: string) => {
    const form = formRef.current;
    const control = form?.elements.namedItem("locale");
    if (control instanceof HTMLSelectElement) {
      control.value = code;
    }
    form?.requestSubmit();
  };

  const isDark = theme === "dark";
  const isMobile = (userAgent?.device?.type ?? "desktop") === "mobile";
  const localeLabel =
    locales.find((l) => l.code === locale)?.englishName ?? locale;
  const DisplayModeIcon =
    displayModes.find((d) => d.mode === displayMode)?.icon ??
    SquareSplitVertical;

  return (
    <form
      ref={formRef}
      toolname="devtools_set_view_options"
      tooldescription={
        variant === "panel"
          ? "Set the Skybridge devtools view preview options. Any subset of fields can be changed: theme, locale, and device type."
          : "Set the Skybridge devtools preview options: theme and device type."
      }
      toolautosubmit=""
      onSubmit={(event) => {
        event.preventDefault();
        const summary = applyViewOptions(new FormData(event.currentTarget));
        const native = event.nativeEvent;
        if (
          native instanceof SubmitEvent &&
          native.agentInvoked &&
          typeof native.respondWith === "function"
        ) {
          native.respondWith(
            Promise.resolve({ content: [{ type: "text", text: summary }] }),
          );
        }
      }}
      className={cn(
        "flex w-full shrink-0 items-center gap-1.5",
        variant === "panel" ? "mt-3 px-3" : "justify-end",
      )}
    >
      {variant === "panel" && (
        <div
          title="Display mode (driven by the view)"
          className="inline-flex h-7 cursor-default items-center gap-1.5 rounded-md bg-muted px-2.5 text-xs font-medium text-muted-foreground"
        >
          <DisplayModeIcon className="size-3.5" />
          <span>{displayMode}</span>
        </div>
      )}

      <ToolbarToggle
        icon={isDark ? Moon : Sun}
        label={isDark ? "dark" : "light"}
        name="darkTheme"
        description="Preview the view in dark theme (true) or light theme (false)."
        checked={isDark}
      />

      {variant === "panel" && (
        <>
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
                          submitLocale(v);
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
          <div className="sr-only" aria-hidden>
            <ViewOptionSelect
              name="locale"
              description="The BCP 47 locale code to preview the view in."
              value={locale}
              options={locales.map((l) => l.code)}
            />
          </div>
        </>
      )}

      <ToolbarToggle
        icon={isMobile ? Smartphone : Monitor}
        label={isMobile ? "mobile" : "desktop"}
        name="mobileDevice"
        description="Preview the view on a mobile device (true) or desktop (false)."
        checked={isMobile}
      />

      {variant === "panel" && displayMode !== "fullscreen" && (
        <div className="ml-auto flex items-center gap-1.5">
          <ToolbarButton
            icon={Eye}
            label="preview"
            onClick={() => setPreviewClient("chatgpt")}
          />
          {!logsOpen && (
            <ToolbarButton icon={Logs} label="logs" onClick={onOpenLogs} />
          )}
        </div>
      )}

      {variant === "preview" && (
        <>
          <ToolbarButton
            icon={ArrowLeftRight}
            label={
              previewClient === "claude"
                ? "switch to ChatGPT"
                : "switch to Claude"
            }
            onClick={() => {
              setPreviewClient(
                previewClient === "claude" ? "chatgpt" : "claude",
              );
              setPreference("displayMode", "inline");
            }}
          />
          <ToolbarButton
            icon={X}
            label="quit preview"
            onClick={() => {
              setPreviewClient(null);
              setPreference("displayMode", "inline");
            }}
          />
        </>
      )}
    </form>
  );
};

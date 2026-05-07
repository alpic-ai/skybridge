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

import { useInspectorPreferencesStore } from "@/lib/inspector-preferences-store.js";
import { cn } from "@/lib/utils.js";

type DisplayMode = "fullscreen" | "pip" | "inline";

const displayModeIcons: Record<DisplayMode, LucideIcon> = {
  fullscreen: Maximize2,
  pip: PictureInPicture2,
  inline: SquareSplitVertical,
};

const displayModeLabels: Record<DisplayMode, string> = {
  fullscreen: "fullscreen",
  pip: "pip",
  inline: "inline",
};

const locales = [
  { code: "am", englishName: "Amharic", localeName: "አማርኛ" },
  { code: "ar", englishName: "Arabic", localeName: "العربية" },
  { code: "bg", englishName: "Bulgarian", localeName: "български" },
  { code: "bn", englishName: "Bengali", localeName: "বাংলা" },
  { code: "bs", englishName: "Bosnian", localeName: "bosanski" },
  { code: "ca", englishName: "Catalan", localeName: "català" },
  { code: "cs", englishName: "Czech", localeName: "čeština" },
  { code: "da", englishName: "Danish", localeName: "dansk" },
  { code: "de", englishName: "German", localeName: "Deutsch" },
  { code: "el", englishName: "Greek", localeName: "Ελληνικά" },
  { code: "en-US", englishName: "English (US)", localeName: "English (US)" },
  {
    code: "es-419",
    englishName: "Spanish (Latin America)",
    localeName: "español (Latinoamérica)",
  },
  {
    code: "es-ES",
    englishName: "Spanish (Spain)",
    localeName: "español (España)",
  },
  { code: "et", englishName: "Estonian", localeName: "eesti" },
  { code: "fa", englishName: "Persian", localeName: "فارسی" },
  { code: "fi", englishName: "Finnish", localeName: "suomi" },
  {
    code: "fr-CA",
    englishName: "French (Canada)",
    localeName: "français (Canada)",
  },
  {
    code: "fr-FR",
    englishName: "French (France)",
    localeName: "français (France)",
  },
  { code: "gu", englishName: "Gujarati", localeName: "ગુજરાતી" },
  { code: "hi", englishName: "Hindi", localeName: "हिन्दी" },
  { code: "hr", englishName: "Croatian", localeName: "hrvatski" },
  { code: "hu", englishName: "Hungarian", localeName: "magyar" },
  { code: "hy", englishName: "Armenian", localeName: "հայերեն" },
  { code: "id", englishName: "Indonesian", localeName: "Indonesia" },
  { code: "is", englishName: "Icelandic", localeName: "íslenska" },
  { code: "it", englishName: "Italian", localeName: "italiano" },
  { code: "ja", englishName: "Japanese", localeName: "日本語" },
  { code: "ka", englishName: "Georgian", localeName: "ქართული" },
  { code: "kk", englishName: "Kazakh", localeName: "қазақ тілі" },
  { code: "kn", englishName: "Kannada", localeName: "ಕನ್ನಡ" },
  { code: "ko", englishName: "Korean", localeName: "한국어" },
  { code: "lt", englishName: "Lithuanian", localeName: "lietuvių" },
  { code: "lv", englishName: "Latvian", localeName: "latviešu" },
  { code: "mk", englishName: "Macedonian", localeName: "македонски" },
  { code: "ml", englishName: "Malayalam", localeName: "മലയാളം" },
  { code: "mn", englishName: "Mongolian", localeName: "монгол" },
  { code: "mr", englishName: "Marathi", localeName: "मराठी" },
  { code: "ms", englishName: "Malay", localeName: "Bahasa Melayu" },
  { code: "my", englishName: "Burmese", localeName: "မြန်မာ" },
  { code: "nb", englishName: "Norwegian Bokmål", localeName: "norsk bokmål" },
  { code: "nl", englishName: "Dutch", localeName: "Nederlands" },
  { code: "pa", englishName: "Punjabi", localeName: "ਪੰਜਾਬੀ" },
  { code: "pl", englishName: "Polish", localeName: "polski" },
  {
    code: "pt-BR",
    englishName: "Portuguese (Brazil)",
    localeName: "português (Brasil)",
  },
  {
    code: "pt-PT",
    englishName: "Portuguese (Portugal)",
    localeName: "português (Portugal)",
  },
  { code: "ro", englishName: "Romanian", localeName: "română" },
  { code: "ru", englishName: "Russian", localeName: "русский" },
  { code: "sk", englishName: "Slovak", localeName: "slovenčina" },
  { code: "sl", englishName: "Slovenian", localeName: "slovenščina" },
  { code: "so", englishName: "Somali", localeName: "Soomaali" },
  { code: "sq", englishName: "Albanian", localeName: "shqip" },
  { code: "sr", englishName: "Serbian", localeName: "српски" },
  { code: "sv", englishName: "Swedish", localeName: "svenska" },
  { code: "sw", englishName: "Swahili", localeName: "Kiswahili" },
  { code: "ta", englishName: "Tamil", localeName: "தமிழ்" },
  { code: "te", englishName: "Telugu", localeName: "తెలుగు" },
  { code: "th", englishName: "Thai", localeName: "ไทย" },
  { code: "tl", englishName: "Tagalog", localeName: "Tagalog" },
  { code: "tr", englishName: "Turkish", localeName: "Türkçe" },
  { code: "uk", englishName: "Ukrainian", localeName: "українська" },
  { code: "ur", englishName: "Urdu", localeName: "اردو" },
  { code: "vi", englishName: "Vietnamese", localeName: "Tiếng Việt" },
  {
    code: "zh-CN",
    englishName: "Chinese (Simplified)",
    localeName: "简体中文",
  },
  {
    code: "zh-HK",
    englishName: "Chinese (Traditional, Hong Kong)",
    localeName: "繁體中文（香港）",
  },
  {
    code: "zh-TW",
    englishName: "Chinese (Traditional, Taiwan)",
    localeName: "繁體中文（台灣）",
  },
];

function ToolbarButton({
  icon: Icon,
  label,
  selected,
  onClick,
  className,
  ...rest
}: {
  icon: LucideIcon;
  label: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
} & Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "className"
>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium transition-colors hover:bg-light-gray hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        selected ? "bg-muted text-foreground" : "text-light-gray-foreground",
        className,
      )}
      {...rest}
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
  const displayMode = useInspectorPreferencesStore(
    (s) => s.displayMode,
  ) as DisplayMode;
  const theme = useInspectorPreferencesStore((s) => s.theme);
  const locale = useInspectorPreferencesStore((s) => s.locale);
  const userAgent = useInspectorPreferencesStore((s) => s.userAgent);
  const setPreference = useInspectorPreferencesStore((s) => s.setPreference);

  const [localeOpen, setLocaleOpen] = useState(false);

  const isDark = theme === "dark";
  const deviceType = userAgent?.device?.type ?? "desktop";
  const isMobile = deviceType === "mobile";

  return (
    <div className="mt-3 flex w-full shrink-0 items-center gap-1.5 px-3">
      <div className="inline-flex h-7 items-center rounded-md border border-border bg-background p-0.5">
        {(Object.keys(displayModeIcons) as DisplayMode[]).map((mode) => {
          const Icon = displayModeIcons[mode];
          const selected = displayMode === mode;
          return (
            <button
              key={mode}
              type="button"
              aria-pressed={selected}
              onClick={() => setPreference("displayMode", mode)}
              className={cn(
                "inline-flex h-full cursor-pointer items-center gap-1.5 rounded px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                selected
                  ? "bg-muted text-foreground"
                  : "text-light-gray-foreground hover:bg-light-gray hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              <span>{displayModeLabels[mode]}</span>
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
            className={cn(
              "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-light-gray-foreground transition-colors hover:bg-light-gray hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              "aria-expanded:bg-muted aria-expanded:text-foreground",
            )}
            aria-label="Locale"
          >
            <Languages className="size-3.5" />
            <span>{locale}</span>
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
                    <span>{l.englishName} </span>
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

      {!logsOpen && (
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

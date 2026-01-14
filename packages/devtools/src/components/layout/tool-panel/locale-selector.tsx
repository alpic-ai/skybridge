import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command.js";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.js";
import { cn } from "@/lib/utils.js";

const locales = [
  { value: "en-US", label: "English (US)" },
  { value: "es-ES", label: "español (España)" },
  { value: "fr-FR", label: "français (France)" },
  { value: "de-DE", label: "Deutsch" },
  { value: "it-IT", label: "italiano" },
  { value: "am-ET", label: "አማርኛ" },
  { value: "ar", label: "العربية" },
  { value: "bg-BG", label: "български" },
  { value: "bn-BD", label: "বাংলা" },
  { value: "bs-BA", label: "bosanski" },
  { value: "ca-ES", label: "català" },
  { value: "cs-CZ", label: "čeština" },
  { value: "da-DK", label: "dansk" },
  { value: "el-GR", label: "Ελληνικά" },
  { value: "es-419", label: "español (Latinoamérica)" },
  { value: "et-EE", label: "eesti" },
  { value: "fi-FI", label: "suomi" },
  { value: "fr-CA", label: "français (Canada)" },
  { value: "gu-IN", label: "ગુજરાતી" },
  { value: "hi-IN", label: "हिन्दी" },
  { value: "hr-HR", label: "hrvatski" },
  { value: "hu-HU", label: "magyar" },
  { value: "hy-AM", label: "հայերեն" },
  { value: "id-ID", label: "Indonesia" },
  { value: "is-IS", label: "íslenska" },
  { value: "ja-JP", label: "日本語" },
  { value: "ka-GE", label: "ქართული" },
  { value: "kk-KZ", label: "қазақ тілі" },
  { value: "kn-IN", label: "ಕನ್ನಡ" },
  { value: "ko-KR", label: "한국어" },
  { value: "lt-LT", label: "lietuvių" },
  { value: "lv-LV", label: "latviešu" },
  { value: "mk-MK", label: "македонски" },
  { value: "ml-IN", label: "മലയാളം" },
  { value: "mn-MN", label: "монгол" },
  { value: "mr-IN", label: "मराठी" },
  { value: "ms-MY", label: "Bahasa Melayu" },
  { value: "my-MM", label: "မြန်မာ" },
  { value: "nb-NO", label: "norsk bokmål" },
  { value: "nl-NL", label: "Nederlands" },
  { value: "pa-IN", label: "ਪੰਜਾਬੀ" },
  { value: "pl-PL", label: "polski" },
  { value: "pt-BR", label: "português (Brasil)" },
  { value: "pt-PT", label: "português (Portugal)" },
  { value: "ro-RO", label: "română" },
  { value: "ru-RU", label: "русский" },
  { value: "sk-SK", label: "slovenčina" },
  { value: "sl-SI", label: "slovenščina" },
  { value: "so-SO", label: "Soomaali" },
  { value: "sq-AL", label: "shqip" },
  { value: "sr-RS", label: "српски" },
  { value: "sv-SE", label: "svenska" },
  { value: "sw-KE", label: "Kiswahili" },
  { value: "ta-IN", label: "தமிழ்" },
  { value: "te-IN", label: "తెలుగు" },
  { value: "th-TH", label: "ไทย" },
  { value: "tl-PH", label: "Tagalog" },
  { value: "tr-TR", label: "Türkçe" },
  { value: "uk-UA", label: "українська" },
  { value: "ur-PK", label: "اردو" },
  { value: "vi-VN", label: "Tiếng Việt" },
  { value: "zh-Hans", label: "简体中文" },
  { value: "zh-Hant-HK", label: "繁體中文（香港）" },
  { value: "zh-Hant-TW", label: "繁體中文（台灣）" },
];

interface LocaleSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

export const LocaleSelector = ({
  value,
  onValueChange,
}: LocaleSelectorProps) => {
  const [open, setOpen] = React.useState(false);

  const selectedLocale = locales.find((locale) => locale.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedLocale ? (
            <span>
              {selectedLocale.value}
              <span className="text-muted-foreground">
                {" "}
                - {selectedLocale.label}
              </span>
            </span>
          ) : (
            "Select locale..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search locale..." />
          <CommandList>
            <CommandEmpty>No locale found.</CommandEmpty>
            <CommandGroup>
              {locales.map((locale) => (
                <CommandItem
                  key={locale.value}
                  value={locale.value}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <span>
                    {locale.label}{" "}
                    <span className="text-muted-foreground">
                      ({locale.value})
                    </span>
                  </span>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === locale.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

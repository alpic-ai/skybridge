---
sidebar_position: 7
---

# useLocale

The `useLocale` hook returns the user's locale as reported by the host application. This is useful for internationalization (i18n) and displaying localized content.

## Basic usage

```tsx
import { useLocale } from "skybridge/web";

function LocalizedGreeting() {
  const locale = useLocale();

  const greetings: Record<string, string> = {
    en: "Hello!",
    fr: "Bonjour!",
    es: "¡Hola!",
    de: "Hallo!",
    ja: "こんにちは！",
  };

  const language = locale.split("-")[0];
  const greeting = greetings[language] || greetings.en;

  return <h1>{greeting}</h1>;
}
```

## Returns

```tsx
locale: string
```

The user's locale string in BCP 47 format (e.g., `"en-US"`, `"fr-FR"`, `"ja-JP"`).

## Examples

### Date Formatting

```tsx
import { useLocale } from "skybridge/web";

function LocalizedDate({ date }: { date: Date }) {
  const locale = useLocale();

  const formattedDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);

  return <time dateTime={date.toISOString()}>{formattedDate}</time>;
}
```

### Number Formatting

```tsx
import { useLocale } from "skybridge/web";

function PriceDisplay({ amount, currency }: { amount: number; currency: string }) {
  const locale = useLocale();

  const formattedPrice = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);

  return <span className="price">{formattedPrice}</span>;
}
```

### i18n Integration

```tsx
import { useLocale } from "skybridge/web";
import { useEffect, useState } from "react";

type Translations = Record<string, string>;

function useTranslations() {
  const locale = useLocale();
  const [translations, setTranslations] = useState<Translations>({});

  useEffect(() => {
    // Load translations based on locale
    const loadTranslations = async () => {
      const language = locale.split("-")[0];
      const response = await fetch(`/locales/${language}.json`);
      const data = await response.json();
      setTranslations(data);
    };

    loadTranslations();
  }, [locale]);

  const t = (key: string) => translations[key] || key;

  return { t, locale };
}

function TranslatedContent() {
  const { t, locale } = useTranslations();

  return (
    <div>
      <p>{t("welcome_message")}</p>
      <small>Locale: {locale}</small>
    </div>
  );
}
```

### List Formatting

```tsx
import { useLocale } from "skybridge/web";

function ItemList({ items }: { items: string[] }) {
  const locale = useLocale();

  const formatter = new Intl.ListFormat(locale, {
    style: "long",
    type: "conjunction",
  });

  return <p>{formatter.format(items)}</p>;
}

// Usage: <ItemList items={["Apple", "Banana", "Cherry"]} />
// en-US: "Apple, Banana, and Cherry"
// fr-FR: "Apple, Banana et Cherry"
```

### Relative Time

```tsx
import { useLocale } from "skybridge/web";

function RelativeTime({ date }: { date: Date }) {
  const locale = useLocale();

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const diffInSeconds = Math.floor((date.getTime() - Date.now()) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  let formatted: string;
  if (Math.abs(diffInDays) >= 1) {
    formatted = rtf.format(diffInDays, "day");
  } else if (Math.abs(diffInHours) >= 1) {
    formatted = rtf.format(diffInHours, "hour");
  } else if (Math.abs(diffInMinutes) >= 1) {
    formatted = rtf.format(diffInMinutes, "minute");
  } else {
    formatted = rtf.format(diffInSeconds, "second");
  }

  return <span>{formatted}</span>;
}
```


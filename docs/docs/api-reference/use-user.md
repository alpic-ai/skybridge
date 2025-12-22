---
sidebar_position: 8
---

# useUser

The `useUser` hook returns session-stable user information. These values are set once at initialization and do not change during the session.

## Basic usage

```tsx
import { useUser } from "skybridge/web";

function UserInfo() {
  const { locale, userAgent } = useUser();

  return (
    <div>
      <p>Locale: {locale}</p>
      <p>Device: {userAgent.device.type}</p>
      <p>Touch: {userAgent.capabilities.touch ? "Yes" : "No"}</p>
    </div>
  );
}
```

## Returns

```tsx
type UserState = {
  locale: string;
  userAgent: UserAgent;
};

type UserAgent = {
  device: {
    type: "mobile" | "tablet" | "desktop" | "unknown";
  };
  capabilities: {
    hover: boolean;
    touch: boolean;
  };
};
```

### `locale`

The user's locale string in BCP 47 format (e.g., `"en-US"`, `"fr-FR"`, `"ja-JP"`).

### `userAgent`

Information about the user's device and its capabilities.

#### `userAgent.device.type`

The type of device the user is on:

- `mobile` - Mobile phone
- `tablet` - Tablet device
- `desktop` - Desktop or laptop computer
- `unknown` - Unable to determine device type

#### `userAgent.capabilities.hover`

Whether the device supports hover interactions (typically `true` for desktop, `false` for touch-only devices).

#### `userAgent.capabilities.touch`

Whether the device supports touch interactions.

## Examples

### Localized Greeting

```tsx
import { useUser } from "skybridge/web";

function LocalizedGreeting() {
  const { locale } = useUser();

  const greetings: Record<string, string> = {
    en: "Hello!",
    fr: "Bonjour!",
    es: "Hola!",
    de: "Hallo!",
    ja: "こんにちは!",
  };

  const language = locale.split("-")[0];
  const greeting = greetings[language] || greetings.en;

  return <h1>{greeting}</h1>;
}
```

### Date Formatting

```tsx
import { useUser } from "skybridge/web";

function LocalizedDate({ date }: { date: Date }) {
  const { locale } = useUser();

  const formattedDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);

  return <time dateTime={date.toISOString()}>{formattedDate}</time>;
}
```

### Number and Currency Formatting

```tsx
import { useUser } from "skybridge/web";

function PriceDisplay({ amount, currency }: { amount: number; currency: string }) {
  const { locale } = useUser();

  const formattedPrice = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);

  return <span className="price">{formattedPrice}</span>;
}
```

### Responsive Component

```tsx
import { useUser } from "skybridge/web";

function ResponsiveLayout({ children }: { children: React.ReactNode }) {
  const { userAgent } = useUser();

  const layoutClass = {
    mobile: "layout-compact",
    tablet: "layout-medium",
    desktop: "layout-full",
    unknown: "layout-full",
  }[userAgent.device.type];

  return <div className={layoutClass}>{children}</div>;
}
```

### Touch-Friendly Controls

```tsx
import { useUser } from "skybridge/web";

function Slider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { userAgent } = useUser();

  // Use larger touch targets on touch devices
  const thumbSize = userAgent.capabilities.touch ? 44 : 20;

  return (
    <input
      type="range"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        height: thumbSize,
        cursor: userAgent.capabilities.hover ? "pointer" : "default",
      }}
    />
  );
}
```

### Hover vs Tap Instructions

```tsx
import { useUser } from "skybridge/web";

function InteractionHint() {
  const { userAgent } = useUser();

  return (
    <p className="hint">
      {userAgent.capabilities.hover
        ? "Hover over items to see details"
        : "Tap items to see details"}
    </p>
  );
}
```

### Adaptive Navigation

```tsx
import { useUser } from "skybridge/web";
import { useState } from "react";

function Navigation({ items }: { items: { label: string; href: string }[] }) {
  const { userAgent } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  // On mobile, show hamburger menu
  if (userAgent.device.type === "mobile") {
    return (
      <nav className="mobile-nav">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="Toggle menu"
        >
          ...
        </button>
        {isOpen && (
          <ul className="mobile-menu">
            {items.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        )}
      </nav>
    );
  }

  // On desktop/tablet, show horizontal nav
  return (
    <nav className="desktop-nav">
      <ul>
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className={userAgent.capabilities.hover ? "hoverable" : ""}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

### Device-Specific Features

```tsx
import { useUser } from "skybridge/web";

function MediaControls() {
  const { userAgent } = useUser();

  return (
    <div className="media-controls">
      <button>Play</button>
      <button>Pause</button>

      {/* Only show keyboard shortcuts hint on desktop */}
      {userAgent.device.type === "desktop" && (
        <span className="shortcut-hint">
          Press Space to play/pause
        </span>
      )}

      {/* Show swipe hint on touch devices */}
      {userAgent.capabilities.touch && (
        <span className="gesture-hint">
          Swipe to seek
        </span>
      )}
    </div>
  );
}
```

### i18n Integration

```tsx
import { useUser } from "skybridge/web";
import { useEffect, useState } from "react";

type Translations = Record<string, string>;

function useTranslations() {
  const { locale } = useUser();
  const [translations, setTranslations] = useState<Translations>({});

  useEffect(() => {
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

### Relative Time

```tsx
import { useUser } from "skybridge/web";

function RelativeTime({ date }: { date: Date }) {
  const { locale } = useUser();

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

### List Formatting

```tsx
import { useUser } from "skybridge/web";

function ItemList({ items }: { items: string[] }) {
  const { locale } = useUser();

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

### Adaptive Grid

```tsx
import { useUser } from "skybridge/web";

type Product = { id: string };

function ProductGrid({ products }: { products: Product[] }) {
  const { userAgent } = useUser();

  const columns = {
    mobile: 1,
    tablet: 2,
    desktop: 4,
    unknown: 2,
  }[userAgent.device.type];

  return (
    <div
      className="product-grid"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: userAgent.device.type === "mobile" ? "8px" : "16px",
      }}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### Input Method Detection

```tsx
import { useUser } from "skybridge/web";

function SearchInput() {
  const { userAgent } = useUser();

  return (
    <div className="search-container">
      <input
        type="search"
        placeholder="Search..."
        // On touch devices, use search keyboard
        inputMode={userAgent.capabilities.touch ? "search" : undefined}
        // Larger font on touch to prevent zoom
        style={{
          fontSize: userAgent.capabilities.touch ? "16px" : "14px",
        }}
      />
    </div>
  );
}
```

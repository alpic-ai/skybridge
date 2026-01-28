# Style and Localize

- Read theme and layout settings → `useLayout`
- Get user locale and device type and capabilities: → `useUser` 

## Theme and layout

**Example:**
```jsx
import { useLayout } from "skybridge/web";

function ThemedWidget() {
  const { theme, maxHeight, safeArea } = useLayout();

  return (
    <div
      style={{
        backgroundColor: theme === "dark" ? "#1a1a1a" : "#ffffff",
        maxHeight,
        paddingTop: safeArea.insets.top,
      }}
    >
      <p>Current theme: {theme}</p>
    </div>
  );
}
```

- `useLayout` returns:
```ts
type LayoutState = {
  theme: "light" | "dark";
  maxHeight: number;
  safeArea: {
    insets: { top: number; right: number; bottom: number; left: number };
  };
};
```

## Locale

**Example:**
```jsx
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

## Device

**Example:**
```jsx
function ProductGrid({ products }) {
    const { userAgent } = useUser();
    const { device, capabilities } = userAgent;

    const cols = { mobile: 1, tablet: 2, desktop: 3, unknown: 2 }[device.type];

    return (
        <div className={`grid-${cols}col ${capabilities.hover ? "hover-effects" : ""}`}>
            {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
    );
}     
```

- `userAgent` is an object of type:
```ts
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
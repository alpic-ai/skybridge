# UI Guidelines

## Contents
- [Display Modes](#display-modes) — inline, fullscreen, PiP, switching
- [Adapting to Host](#adapting-to-host) — layout constraints, theme
- [Adapting to User](#adapting-to-user) — device, locale

## Display Modes

Widgets render **inline by default**. Add fullscreen and/or PiP when the use case benefits from it—implement triggers (button, gesture) to let users switch.

### Inline (default)

Widget appears embedded in conversation above the model response.

**Use for:** Single result display, quick actions, browsing items.

**Constraints:**
- Max 2 CTAs (one primary, one secondary)
- No `overflow: scroll/auto`—content must fit within available space
- No tabs or deep navigation

**Patterns:**
- **Card** — Single-purpose widget (order confirmation, weather, status)
- **Carousel** — 3-8 browsable items with image + title + max 3 lines metadata

### Fullscreen

Immersive experience for complex tasks. ChatGPT composer remains overlaid at bottom.

**Use for:** Multi-step workflows, rich editing, explorable content, detailed comparisons.

**Constraints:**
- Composer overlay always visible at bottom
- User can still chat while in fullscreen

### Picture-in-Picture (PiP)

Persistent floating window that stays visible during conversation.

**Use for:** Live sessions (timers, streams), games, real-time status.

**Constraints:**
- Must update/respond to user interaction—don't use for static content
- Minimal controls—this is a glanceable surface
- On mobile, PiP coerces to fullscreen

### Switching Modes

Use `useDisplayMode` to read current mode and request changes.
Switch modes upon user interaction only-do not switch mode programmatically. Host may reject the request.

```tsx
import { useDisplayMode } from "skybridge/web";

function ExpandableWidget() {
  const [displayMode, setDisplayMode] = useDisplayMode();
  const isFullscreen = displayMode === "fullscreen";

  if (isFullscreen) {
    return (
      <div className="fullscreen-view">
        {/* Expanded layout */}
        <button onClick={() => setDisplayMode("inline")}>Collapse</button>
      </div>
    );
  }

  return (
    <div className="inline-view">
      {/* Compact layout */}
      <button onClick={() => setDisplayMode("fullscreen")}>Expand</button>
    </div>
  );
}
```

## Adapting to Host

Use `useLayout` to read host environment constraints.

### Layout Constraints

- `maxHeight`: Maximum height available for the widget in pixels
- `safeArea.insets`: Padding to avoid device notches, composer overlay, and navigation bars

```tsx
import { useLayout } from "skybridge/web";

function Container({ children }) {
  const { maxHeight, safeArea } = useLayout();
  const { top, right, bottom, left } = safeArea.insets;

  return (
    <div style={{ maxHeight, padding: `${top}px ${right}px ${bottom}px ${left}px` }}>
      {children}
    </div>
  );
}
```

### Theme

Match the host color scheme using `theme` from `useLayout`.

```tsx
import { useLayout } from "skybridge/web";

function Container({ children }) {
  const { theme } = useLayout();
  const isDark = theme === "dark";

  return <div className={isDark ? "bg-surface-dark" : "bg-surface-light"}>{children}</div>;
}
```

## Adapting to User

Use `useUser` to read user context.

### Device

- `device.type`: `"mobile" | "tablet" | "desktop" | "unknown"`
- `capabilities.hover`: `true` if device supports hover (mouse)
- `capabilities.touch`: `true` if device supports touch

```tsx
import { useUser } from "skybridge/web";

function ProductCard({ product }) {
  const { userAgent } = useUser();
  const { device, capabilities } = userAgent;

  return (
    <div className={capabilities.hover ? "hover:shadow-lg" : ""}>
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      {device.type === "mobile" && <button>Add to Cart</button>}
      {capabilities.touch && <p className="hint">Swipe for more</p>}
    </div>
  );
}
```

### Locale

Use `locale` from `useUser` to adapt content to user's language.

```tsx
import { useUser } from "skybridge/web";

function LocalizedGreeting() {
  const { locale } = useUser();

  const greetings = {
    en: "Hello!",
    fr: "Bonjour!",
    zh: "你好!",
  };

  const language = locale.split("-")[0];
  const greeting = greetings[language] || greetings.en;

  return <h1>{greeting}</h1>;
}
```
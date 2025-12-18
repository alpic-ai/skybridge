---
sidebar_position: 14
---

# useUserAgent

The `useUserAgent` hook returns information about the user's device and its capabilities. This is useful for creating responsive layouts and adapting interactions based on the device type.

## Basic usage

```tsx
import { useUserAgent } from "skybridge/web";

function DeviceInfo() {
  const userAgent = useUserAgent();

  return (
    <div>
      <p>Device: {userAgent.device.type}</p>
      <p>Touch: {userAgent.capabilities.touch ? "Yes" : "No"}</p>
      <p>Hover: {userAgent.capabilities.hover ? "Yes" : "No"}</p>
    </div>
  );
}
```

## Returns

```tsx
userAgent: UserAgent
```

An object containing device and capability information.

### `UserAgent` Type

```tsx
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

#### `device.type`

The type of device the user is on:

- `mobile` - Mobile phone
- `tablet` - Tablet device
- `desktop` - Desktop or laptop computer
- `unknown` - Unable to determine device type

#### `capabilities.hover`

Whether the device supports hover interactions (typically `true` for desktop, `false` for touch-only devices).

#### `capabilities.touch`

Whether the device supports touch interactions.

## Examples

### Responsive Component

```tsx
import { useUserAgent } from "skybridge/web";

function ResponsiveLayout({ children }: { children: React.ReactNode }) {
  const { device } = useUserAgent();

  const layoutClass = {
    mobile: "layout-compact",
    tablet: "layout-medium",
    desktop: "layout-full",
    unknown: "layout-full",
  }[device.type];

  return <div className={layoutClass}>{children}</div>;
}
```

### Touch-Friendly Controls

```tsx
import { useUserAgent } from "skybridge/web";

function Slider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { capabilities } = useUserAgent();

  // Use larger touch targets on touch devices
  const thumbSize = capabilities.touch ? 44 : 20;

  return (
    <input
      type="range"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        height: thumbSize,
        cursor: capabilities.hover ? "pointer" : "default",
      }}
    />
  );
}
```

### Hover vs Tap Instructions

```tsx
import { useUserAgent } from "skybridge/web";

function InteractionHint() {
  const { capabilities } = useUserAgent();

  return (
    <p className="hint">
      {capabilities.hover
        ? "Hover over items to see details"
        : "Tap items to see details"}
    </p>
  );
}
```

### Adaptive Navigation

```tsx
import { useUserAgent } from "skybridge/web";
import { useState } from "react";

function Navigation({ items }: { items: { label: string; href: string }[] }) {
  const { device, capabilities } = useUserAgent();
  const [isOpen, setIsOpen] = useState(false);

  // On mobile, show hamburger menu
  if (device.type === "mobile") {
    return (
      <nav className="mobile-nav">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="Toggle menu"
        >
          ☰
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
              className={capabilities.hover ? "hoverable" : ""}
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
import { useUserAgent } from "skybridge/web";

function MediaControls() {
  const { device, capabilities } = useUserAgent();

  return (
    <div className="media-controls">
      <button>Play</button>
      <button>Pause</button>

      {/* Only show keyboard shortcuts hint on desktop */}
      {device.type === "desktop" && (
        <span className="shortcut-hint">
          Press Space to play/pause
        </span>
      )}

      {/* Show swipe hint on touch devices */}
      {capabilities.touch && (
        <span className="gesture-hint">
          Swipe to seek
        </span>
      )}
    </div>
  );
}
```

### Adaptive Grid

```tsx
import { useUserAgent } from "skybridge/web";

function ProductGrid({ products }: { products: Product[] }) {
  const { device } = useUserAgent();

  const columns = {
    mobile: 1,
    tablet: 2,
    desktop: 4,
    unknown: 2,
  }[device.type];

  return (
    <div
      className="product-grid"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: device.type === "mobile" ? "8px" : "16px",
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
import { useUserAgent } from "skybridge/web";

function SearchInput() {
  const { capabilities } = useUserAgent();

  return (
    <div className="search-container">
      <input
        type="search"
        placeholder="Search..."
        // On touch devices, use search keyboard
        inputMode={capabilities.touch ? "search" : undefined}
        // Larger font on touch to prevent zoom
        style={{
          fontSize: capabilities.touch ? "16px" : "14px",
        }}
      />
    </div>
  );
}
```


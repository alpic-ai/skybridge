---
sidebar_position: 9
---

# useTheme

The `useTheme` hook returns the current color theme (`"light"` or `"dark"`) as set by the host application. Use this to style your widget to match the user's preferred appearance.

## Basic usage

```tsx
import { useTheme } from "skybridge/web";

function ThemedWidget() {
  const theme = useTheme();

  return (
    <div className={`widget widget--${theme}`}>
      <p>Current theme: {theme}</p>
    </div>
  );
}
```

## Returns

```tsx
theme: "light" | "dark"
```

The current color theme of the host application.

## Examples

### Conditional Styling

```tsx
import { useTheme } from "skybridge/web";

function ThemedCard() {
  const theme = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      style={{
        backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
        color: isDark ? "#ffffff" : "#000000",
        padding: "16px",
        borderRadius: "8px",
        border: `1px solid ${isDark ? "#333" : "#e0e0e0"}`,
      }}
    >
      <h3>Themed Card</h3>
      <p>This card adapts to the current theme.</p>
    </div>
  );
}
```

### CSS Class-Based Theming

```tsx
import { useTheme } from "skybridge/web";

function Widget() {
  const theme = useTheme();

  return (
    <div className={`widget ${theme === "dark" ? "dark" : "light"}`}>
      <header className="widget-header">
        <h2>My Widget</h2>
      </header>
      <main className="widget-content">
        <p>Content goes here</p>
      </main>
    </div>
  );
}
```

```css
.widget {
  padding: 16px;
  border-radius: 8px;
}

.widget.light {
  background-color: #ffffff;
  color: #1a1a1a;
}

.widget.dark {
  background-color: #1a1a1a;
  color: #f5f5f5;
}

.widget.light .widget-header {
  border-bottom: 1px solid #e0e0e0;
}

.widget.dark .widget-header {
  border-bottom: 1px solid #333;
}
```

### CSS Variables Theme Provider

```tsx
import { useTheme } from "skybridge/web";
import { useEffect } from "react";

const lightTheme = {
  "--bg-primary": "#ffffff",
  "--bg-secondary": "#f5f5f5",
  "--text-primary": "#1a1a1a",
  "--text-secondary": "#666666",
  "--border-color": "#e0e0e0",
  "--accent-color": "#0066cc",
};

const darkTheme = {
  "--bg-primary": "#1a1a1a",
  "--bg-secondary": "#2d2d2d",
  "--text-primary": "#f5f5f5",
  "--text-secondary": "#a0a0a0",
  "--border-color": "#404040",
  "--accent-color": "#4da6ff",
};

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const variables = theme === "dark" ? darkTheme : lightTheme;

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [theme, variables]);

  return <>{children}</>;
}
```

### Theme-Aware Icon

```tsx
import { useTheme } from "skybridge/web";

function ThemeIcon() {
  const theme = useTheme();

  return (
    <span role="img" aria-label={`${theme} mode`}>
      {theme === "dark" ? "🌙" : "☀️"}
    </span>
  );
}
```

### Chart with Theme Colors

```tsx
import { useTheme } from "skybridge/web";

type DataPoint = {
  label: string;
  value: number;
};

function BarChart({ data }: { data: DataPoint[] }) {
  const theme = useTheme();
  const isDark = theme === "dark";

  const colors = {
    bar: isDark ? "#4da6ff" : "#0066cc",
    barHover: isDark ? "#80c1ff" : "#0052a3",
    grid: isDark ? "#333" : "#e0e0e0",
    text: isDark ? "#a0a0a0" : "#666666",
  };

  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="bar-chart">
      {data.map((item) => (
        <div key={item.label} className="bar-container">
          <div
            className="bar"
            style={{
              width: `${(item.value / maxValue) * 100}%`,
              backgroundColor: colors.bar,
            }}
          />
          <span style={{ color: colors.text }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
```

### Theme-Sensitive Images

```tsx
import { useTheme } from "skybridge/web";

function Logo() {
  const theme = useTheme();

  return (
    <img
      src={theme === "dark" ? "/logo-light.svg" : "/logo-dark.svg"}
      alt="Logo"
      className="logo"
    />
  );
}
```


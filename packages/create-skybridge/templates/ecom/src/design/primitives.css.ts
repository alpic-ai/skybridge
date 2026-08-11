import { createGlobalTheme } from "@vanilla-extract/css";

/**
 * Non-mode-aware design primitives: the raw scales every theme and recipe
 * draws from. Values here are brand-neutral placeholders.
 *
 * @todo: replace these with your brand's real tokens (ideally extracted from
 * a Figma design file). Change values, not the shape: the space/radius/font
 * keys are referenced by sprinkles.css.ts and the recipes. Nothing outside
 * this file should hard-code a hex, size, or spacing value.
 */
export const primitives = createGlobalTheme(":root", {
  // Spacing scale (4px based). Used for padding, margin, and gap via sprinkles.
  space: {
    none: "0",
    "5xs": "2px",
    "4xs": "4px",
    "3xs": "8px",
    "2xs": "12px",
    xs: "16px",
    s: "24px",
    m: "32px",
    l: "40px",
    xl: "48px",
    "2xl": "56px",
    "3xl": "64px",
  },
  radius: {
    none: "0",
    xs: "2px",
    s: "4px",
    m: "8px",
    l: "16px",
    xl: "32px",
    full: "999px",
  },
  font: {
    family: {
      // @todo: swap in your brand font (add its @font-face to fonts.css). The
      // system stack is the zero-asset default.
      primary:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
    weight: {
      regular: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
    size: {
      xs: "12px",
      s: "14px",
      m: "16px",
      l: "20px",
      xl: "24px",
      "2xl": "32px",
      "3xl": "40px",
    },
    lineHeight: {
      tight: "1.25",
      normal: "1.5",
    },
    letterSpacing: {
      default: "0",
      wide: "0.5px",
    },
  },
  stroke: {
    thin: "1px",
    medium: "1.5px",
    thick: "2px",
  },
  // Raw greyscale ramp. Themes pick from these for surface/content/border.
  grey: {
    white: "#ffffff",
    "50": "#f8f8f8",
    "100": "#f2f2f2",
    "200": "#e1e1e1",
    "300": "#b4b4b4",
    "400": "#929292",
    "500": "#727272",
    "600": "#636363",
    "700": "#4c4c4c",
    "800": "#333333",
    "900": "#1a1a1a",
    black: "#000000",
  },
  // @todo: your brand accent ramp (call-to-action, links, highlights). Steps
  // named by lightness, like the grey ramp; each theme picks the shade that
  // reads well on its surface (light mode the darker step, dark mode the
  // lighter one). Add more steps as needed.
  accent: {
    "400": "#7ba0f5",
    "600": "#3b6cf0",
  },
  // Status colors, shared across themes.
  status: {
    error: "#c53929",
    success: "#5c7d0b",
  },
});

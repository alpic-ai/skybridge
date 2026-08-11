import { createGlobalTheme } from "@vanilla-extract/css";

/**
 * Non-mode-aware design primitives: the raw scales every theme and recipe
 * draws from. Values are the Alpic brand tokens, extracted from the live
 * alpic.ai site (Framer inlines styles, so these are observed computed values,
 * not a formal named ramp — see SPEC phase 5). Provenance: https://alpic.ai.
 * Change values, not the shape: the space/radius/font keys are referenced by
 * sprinkles.css.ts and the recipes.
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
    m: "8px", // Alpic buttons
    l: "20px", // Alpic cards
    xl: "32px",
    full: "999px",
  },
  font: {
    family: {
      // Alpic uses "Mozilla Text" for display + body (self-hosted, fonts.css).
      primary: '"Mozilla Text", system-ui, sans-serif',
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
      tight: "1.1", // Alpic headings run tight (1.1)
      normal: "1.4", // Alpic body line-height
    },
    letterSpacing: {
      default: "0",
      // Alpic headings carry negative tracking (~-0.02em on the hero).
      tight: "-0.02em",
      wide: "0.06em", // eyebrow labels are tracked out + uppercase
    },
  },
  stroke: {
    thin: "1px",
    medium: "1.5px",
    thick: "2px",
  },
  // Neutral ramp — Alpic's "black" is a near-black teal-green, so the whole
  // ramp is green-tinted (white/50/100/200 observed on the site; the mid steps
  // are interpolated to fill the ramp coherently).
  grey: {
    white: "#ffffff",
    "50": "#f5f9fa", // light page surface
    "100": "#eaf4f3", // mint-tinted surface / image stage
    "200": "#e6e8e6", // hairline border
    "300": "#c6d2d0",
    "400": "#9daba9",
    "500": "#6e7c7a", // muted text on light
    "600": "#465250",
    "700": "#303837", // elevated panel on dark
    "800": "#16211f",
    "900": "#081c1b", // dark page surface
    black: "#051413", // brand near-black (teal-green)
  },
  // Magenta scale: the secondary highlight (themes map it to common.highlight).
  // 500 resting; 600 hover/darker; 400 a lighter step that pops on dark.
  accent: {
    "400": "#f2477f",
    "500": "#ed115e",
    "600": "#c80850",
  },
  // Mint/cyan scale: the primary brand accent / CTA fill (common.accent).
  // 300 is the bright on-dark step; 700 a deepened step readable on light.
  mint: {
    "300": "#89f0ec",
    "700": "#1e7a76",
  },
  // Status colors, shared across themes.
  status: {
    error: "#c53929",
    success: "#5c7d0b",
  },
});

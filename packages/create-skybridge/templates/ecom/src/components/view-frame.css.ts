import { globalStyle, style } from "@vanilla-extract/css";
import { colors, primitives } from "../design/tokens";

/**
 * Base surface for the frame. Paints the page background (the theme's
 * surface.extraLight, so light and dark each get their own solid color) and
 * pins the design system's font + content color so descendants inherit from
 * the DS, not from the host page (whose text color could be white on a dark
 * host and make card text vanish).
 */
export const viewFrame = style({
  backgroundColor: colors.surface.extraLight,
  color: colors.content.intense,
  fontFamily: primitives.font.family.primary,
  fontSize: primitives.font.size.m,
  lineHeight: primitives.font.lineHeight.normal,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
});

// Box-sizing reset scoped to the frame subtree.
globalStyle(`${viewFrame} *, ${viewFrame} *::before, ${viewFrame} *::after`, {
  boxSizing: "border-box",
});

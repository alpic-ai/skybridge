import { createThemeContract } from "@vanilla-extract/css";

/**
 * Semantic color contract. Every field must be satisfied by both
 * themes/light.css.ts and themes/dark.css.ts: TypeScript errors on drift.
 *
 * Adding a field here forces both themes to set a value. The compiler is the
 * enforcement mechanism that keeps light and dark coherent.
 *
 * @todo: add or remove semantic slots to fit your UI. Keep names intent-based
 * (surface.subtle, content.intense), not literal (grey100): the point is that
 * components reference meaning, and the theme decides the hex.
 */
export const colors = createThemeContract({
  surface: {
    extraLight: null,
    light: null,
    subtle: null,
    intense: null,
  },
  content: {
    intense: null,
    subtle: null,
    invertIntense: null,
    invertSubtle: null,
  },
  border: {
    thin: null,
    subtle: null,
    intense: null,
  },
  common: {
    accent: null,
    invertAccent: null,
    highlight: null,
    error: null,
    success: null,
  },
});

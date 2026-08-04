import { createThemeContract } from "@vanilla-extract/css";

/**
 * Semantic color contract. Every field must be satisfied by both
 * themes/light.css.ts and themes/dark.css.ts: TypeScript errors on drift.
 *
 * Adding a field here forces both themes to set a value. The compiler is the
 * enforcement mechanism that keeps light and dark coherent. The template's slot
 * set fits the Alpic UI as-is; names stay intent-based (surface.subtle,
 * content.intense), so components reference meaning and the theme decides hex.
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

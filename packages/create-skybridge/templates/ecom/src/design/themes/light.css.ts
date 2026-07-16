import { createTheme } from "@vanilla-extract/css";
import { colors } from "../contract.css";
import { primitives } from "../primitives.css";

/**
 * Light palette: maps each semantic slot to a primitive.
 *
 * @todo: tune these mappings to your brand. dark.css.ts must fill the same
 * slots (the contract enforces it).
 */
export const lightTheme = createTheme(colors, {
  surface: {
    extraLight: primitives.grey.white,
    light: primitives.grey["50"],
    subtle: primitives.grey["200"],
    intense: primitives.grey["400"],
  },
  content: {
    intense: primitives.grey["900"],
    subtle: primitives.grey["500"],
    invertIntense: primitives.grey["50"],
    invertSubtle: primitives.grey["300"],
  },
  border: {
    thin: primitives.grey["200"],
    subtle: primitives.grey["300"],
    intense: primitives.grey["400"],
  },
  common: {
    accent: primitives.accent["600"],
    invertAccent: primitives.grey.white,
    highlight: primitives.accent["600"],
    error: primitives.status.error,
    success: primitives.status.success,
  },
});

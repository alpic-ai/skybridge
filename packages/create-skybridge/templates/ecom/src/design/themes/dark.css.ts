import { createTheme } from "@vanilla-extract/css";
import { colors } from "../contract.css";
import { primitives } from "../primitives.css";

/**
 * Dark palette. Fills the same contract slots as light.css.ts (surface and
 * content swap ends of the grey ramp).
 *
 * @todo: tune these mappings to your brand.
 */
export const darkTheme = createTheme(colors, {
  surface: {
    extraLight: primitives.grey.black,
    light: primitives.grey["900"],
    subtle: primitives.grey["700"],
    intense: primitives.grey["400"],
  },
  content: {
    intense: primitives.grey["50"],
    subtle: primitives.grey["300"],
    invertIntense: primitives.grey["900"],
    invertSubtle: primitives.grey["500"],
  },
  border: {
    thin: primitives.grey["700"],
    subtle: primitives.grey["600"],
    intense: primitives.grey["400"],
  },
  common: {
    accent: primitives.accent["400"],
    invertAccent: primitives.grey.black,
    highlight: primitives.accent["400"],
    error: primitives.status.error,
    success: primitives.status.success,
  },
});
